import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import {
  SkillRegistryError,
  type SkillRegistrySkill,
  type SkillRegistrySnapshot,
  type SkillScope,
  type SkillId,
} from "@rune/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Semaphore from "effect/Semaphore";
import { parse as parseYaml } from "yaml";

import { ServerConfig } from "../config.ts";
import { getMattPocockMetadata, MATT_POCOCK_PACK } from "./mattPocockPack.ts";

const BODY_CACHE_TTL_MS = 60_000;
const SKILL_FILE = "SKILL.md";
const COMPATIBILITY_ROOTS = [
  ".agents/skills",
  ".cursor/skills",
  ".claude/skills",
  ".codex/skills",
] as const;

export interface SkillCandidate {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly source: string;
  readonly sourceAdapter: string;
  readonly sourcePath: string;
  readonly scope: SkillScope;
  readonly contentHash: string;
  readonly explicitOnly: boolean;
  readonly aliases: ReadonlyArray<string>;
  readonly requiredTools: ReadonlyArray<string>;
  readonly optionalTools: ReadonlyArray<string>;
  readonly references: ReadonlyArray<string>;
  readonly scripts: ReadonlyArray<string>;
  readonly assets: ReadonlyArray<string>;
  readonly license?: string;
  readonly compatibility: ReadonlyArray<string>;
  readonly dependencies: ReadonlyArray<string>;
}

export interface SkillDiscoveryAdapter {
  readonly id: string;
  readonly discover:
    | Effect.Effect<ReadonlyArray<SkillCandidate>, SkillRegistryError>
    | (() => Effect.Effect<ReadonlyArray<SkillCandidate>, SkillRegistryError>);
}

interface RegisteredSkill extends SkillCandidate {
  readonly id: SkillId;
  readonly version: number;
  readonly enabled: boolean;
  readonly lastUsedAt: string | null;
}

interface BodyCacheEntry {
  readonly body: string;
  readonly expiresAt: number;
}

function fail(kind: ConstructorParameters<typeof SkillRegistryError>[0]["kind"], message: string) {
  return Effect.fail(new SkillRegistryError({ kind, message }));
}

function slugify(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((entry): entry is string => typeof entry === "string");
  return typeof value === "string" ? [value] : [];
}

function parseFrontmatter(body: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(body);
  if (!match) return {};
  try {
    const parsed: unknown = parseYaml(match[1] ?? "");
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function isWithin(root: string, candidate: string): boolean {
  const relative = NodePath.relative(root, candidate);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${NodePath.sep}`) &&
      !NodePath.isAbsolute(relative))
  );
}

async function hashSkillDirectory(
  directory: string,
  skillFilePath: string,
  skillFileContents: string,
): Promise<string> {
  const files = [{ path: SKILL_FILE, contents: skillFileContents }];
  const visit = async (currentDirectory: string, relativeDirectory: string): Promise<void> => {
    const entries = await NodeFS.readdir(currentDirectory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (entry.isSymbolicLink()) continue;
      const absolutePath = NodePath.join(currentDirectory, entry.name);
      const relativePath = NodePath.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else if (entry.isFile() && absolutePath !== skillFilePath) {
        const contents = await NodeFS.readFile(absolutePath, "utf8").catch(() => undefined);
        if (contents !== undefined) files.push({ path: relativePath, contents });
      }
    }
  };
  await visit(directory, "");
  files.sort((left, right) => left.path.localeCompare(right.path));
  const hash = NodeCrypto.createHash("sha256");
  for (const file of files) {
    hash.update(file.path).update("\0").update(file.contents).update("\0");
  }
  return hash.digest("hex");
}

function toWire(skill: RegisteredSkill): SkillRegistrySkill {
  return {
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    version: skill.version,
    source: skill.source,
    sourceAdapter: skill.sourceAdapter,
    scope: skill.scope,
    explicitOnly: skill.explicitOnly,
    aliases: [...skill.aliases],
    requiredTools: [...skill.requiredTools],
    optionalTools: [...skill.optionalTools],
    references: [...skill.references],
    scripts: [...skill.scripts],
    assets: [...skill.assets],
    ...(skill.license ? { license: skill.license } : {}),
    compatibility: [...skill.compatibility],
    dependencies: [...skill.dependencies],
    contentHash: skill.contentHash,
    enabled: skill.enabled,
    lastUsedAt: skill.lastUsedAt,
  };
}

function makeSourceRoots(
  projectCwd: string,
): ReadonlyArray<{ readonly path: string; readonly scope: SkillScope; readonly id: string }> {
  const projectRoots = COMPATIBILITY_ROOTS.map((relative) => ({
    path: NodePath.resolve(projectCwd, relative),
    scope: "project" as const,
    id: `filesystem:${relative}`,
  }));
  const home = NodeOS.homedir();
  const personalRoots = COMPATIBILITY_ROOTS.map((relative) => ({
    path: NodePath.resolve(home, relative),
    scope: "personal" as const,
    id: `filesystem:user:${relative}`,
  }));
  return [...projectRoots, ...personalRoots];
}

function makeFilesystemAdapter(
  root: { path: string; scope: SkillScope; id: string },
  projectCwd: string,
): SkillDiscoveryAdapter {
  return {
    id: root.id,
    discover: Effect.tryPromise({
      try: async () => {
        const rootRealPath = await NodeFS.realpath(root.path).catch(() => undefined);
        if (!rootRealPath) return [];
        const projectRealPath = await NodeFS.realpath(projectCwd).catch(() => undefined);
        if (
          root.scope === "project" &&
          (!projectRealPath || !isWithin(projectRealPath, rootRealPath))
        ) {
          return [];
        }
        const entries = await NodeFS.readdir(rootRealPath, { withFileTypes: true }).catch(() => []);
        const candidates: SkillCandidate[] = [];
        for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
          if (!entry.isDirectory()) continue;
          const skillDirectory = NodePath.join(rootRealPath, entry.name);
          const skillDirectoryRealPath = await NodeFS.realpath(skillDirectory).catch(
            () => undefined,
          );
          if (!skillDirectoryRealPath || !isWithin(rootRealPath, skillDirectoryRealPath)) continue;
          const sourcePath = NodePath.join(skillDirectory, SKILL_FILE);
          const sourceRealPath = await NodeFS.realpath(sourcePath).catch(() => undefined);
          if (!sourceRealPath || !isWithin(skillDirectoryRealPath, sourceRealPath)) continue;
          const contents = await NodeFS.readFile(sourceRealPath, "utf8").catch(() => undefined);
          if (contents === undefined) continue;
          const slug = slugify(entry.name);
          if (!slug) continue;
          const frontmatter = parseFrontmatter(contents);
          const name =
            typeof frontmatter.name === "string" && frontmatter.name.trim()
              ? frontmatter.name.trim()
              : entry.name;
          const metadata = getMattPocockMetadata(name);
          const metadataDependencies =
            metadata !== undefined && "dependencies" in metadata
              ? metadata.dependencies
              : undefined;
          const siblingEntries = await NodeFS.readdir(skillDirectoryRealPath, {
            withFileTypes: true,
          }).catch(() => []);
          const names = (directory: string) =>
            siblingEntries.some((item) => item.isDirectory() && item.name === directory)
              ? [directory]
              : [];
          candidates.push({
            slug,
            name,
            description:
              typeof frontmatter.description === "string" ? frontmatter.description.trim() : "",
            source: metadata ? MATT_POCOCK_PACK.source : "local-filesystem",
            sourceAdapter: root.id,
            sourcePath: sourceRealPath,
            scope: root.scope,
            contentHash: await hashSkillDirectory(
              skillDirectoryRealPath,
              NodePath.join(skillDirectoryRealPath, SKILL_FILE),
              contents,
            ),
            explicitOnly: frontmatter["disable-model-invocation"] === true,
            aliases: normalizeList(frontmatter.aliases),
            requiredTools: normalizeList(frontmatter["allowed-tools"]),
            optionalTools: normalizeList(frontmatter["optional-tools"]),
            references: names("references"),
            scripts: names("scripts"),
            assets: names("assets"),
            ...(metadata?.name
              ? { license: MATT_POCOCK_PACK.license }
              : typeof frontmatter.license === "string"
                ? { license: frontmatter.license }
                : {}),
            compatibility: normalizeList(frontmatter.compatibility),
            dependencies: metadataDependencies
              ? [...metadataDependencies]
              : normalizeList(frontmatter.dependencies),
          });
        }
        return candidates;
      },
      catch: (cause) =>
        new SkillRegistryError({ kind: "discovery-failed", message: String(cause) }),
    }),
  };
}

export interface SkillRegistryShape {
  readonly list: Effect.Effect<SkillRegistrySnapshot, SkillRegistryError>;
  readonly refresh: Effect.Effect<SkillRegistrySnapshot, SkillRegistryError>;
  readonly getBody: (
    id: SkillId,
  ) => Effect.Effect<
    { readonly id: SkillId; readonly contentHash: string; readonly body: string },
    SkillRegistryError
  >;
  readonly bridge: SkillExecutionBridge;
}

export class SkillRegistry extends Context.Service<SkillRegistry, SkillRegistryShape>()(
  "rune/provider/SkillRegistry",
) {}

export interface SkillExecutionProjection {
  readonly skills: ReadonlyArray<SkillRegistrySkill>;
  readonly sourceDirectories: ReadonlyArray<string>;
  readonly compiledPrompt: string;
}

export interface SkillExecutionBridge {
  readonly compile: (input: {
    readonly skillIds: ReadonlyArray<SkillId>;
    readonly provider: string;
    readonly platformCapabilities?: ReadonlyArray<string>;
    readonly activeGoal?: string;
  }) => Effect.Effect<SkillExecutionProjection, SkillRegistryError>;
}

export const makeSkillRegistry = (input: {
  readonly projectCwd: string;
  readonly adapters?: ReadonlyArray<SkillDiscoveryAdapter>;
}): SkillRegistryShape => {
  const records = new Map<SkillId, RegisteredSkill>();
  const previousVersions = new Map<string, { readonly hash: string; readonly version: number }>();
  const bodyCache = new Map<SkillId, BodyCacheEntry>();
  const refreshMutex = Semaphore.makeUnsafe(1);
  const roots = makeSourceRoots(input.projectCwd);
  const adapters =
    input.adapters ?? roots.map((root) => makeFilesystemAdapter(root, input.projectCwd));
  let registryVersion = 0;

  const refresh = refreshMutex.withPermit(
    Effect.gen(function* () {
      const discovered = yield* Effect.forEach(
        adapters,
        (adapter) =>
          typeof adapter.discover === "function" ? adapter.discover() : adapter.discover,
        { concurrency: "unbounded" },
      );
      const next = new Map<SkillId, RegisteredSkill>();
      for (const candidate of discovered.flat()) {
        const id = `${candidate.contentHash}:${candidate.slug}` as SkillId;
        const old = previousVersions.get(candidate.slug.toLocaleLowerCase());
        const version = old
          ? old.hash === candidate.contentHash
            ? old.version
            : old.version + 1
          : 1;
        previousVersions.set(candidate.slug.toLocaleLowerCase(), {
          hash: candidate.contentHash,
          version,
        });
        const existing = next.get(id);
        // Same body and slug discovered from multiple compatibility roots is
        // one identity. Keep the first deterministic source, but aggregate
        // compatibility labels without exposing duplicate UI entries.
        if (existing) {
          next.set(id, {
            ...existing,
            compatibility: [
              ...new Set([
                ...existing.compatibility,
                ...candidate.compatibility,
                candidate.sourceAdapter,
              ]),
            ],
          });
          continue;
        }
        next.set(id, {
          ...candidate,
          id,
          version,
          enabled: records.get(id)?.enabled ?? true,
          lastUsedAt: records.get(id)?.lastUsedAt ?? null,
        });
      }
      records.clear();
      for (const [id, record] of next) records.set(id, record);
      registryVersion += 1;
      return {
        version: registryVersion,
        skills: [...records.values()]
          .map(toWire)
          .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
      } satisfies SkillRegistrySnapshot;
    }),
  );

  const readBody = (id: SkillId) =>
    Effect.gen(function* () {
      const record = records.get(id);
      if (!record) return yield* fail("not-found", `Skill '${id}' was not found.`);
      const cached = bodyCache.get(id);
      if (cached && cached.expiresAt > Date.now())
        return { id, contentHash: record.contentHash, body: cached.body };
      const sourcePath = yield* Effect.tryPromise({
        try: () => NodeFS.realpath(record.sourcePath),
        catch: () =>
          new SkillRegistryError({
            kind: "invalid-source",
            message: `Skill source '${record.sourcePath}' is unavailable.`,
          }),
      });
      const allowedRoots = yield* Effect.promise(async () => {
        const projectRealPath = await NodeFS.realpath(input.projectCwd).catch(() => undefined);
        const resolvedRoots: string[] = [];
        for (const root of roots) {
          const rootRealPath = await NodeFS.realpath(root.path).catch(() => undefined);
          if (
            rootRealPath &&
            (root.scope !== "project" ||
              (projectRealPath !== undefined && isWithin(projectRealPath, rootRealPath)))
          ) {
            resolvedRoots.push(rootRealPath);
          }
        }
        return resolvedRoots;
      });
      const contained = allowedRoots.some((root) => isWithin(root, sourcePath));
      if (!contained)
        return yield* fail(
          "invalid-source",
          `Skill source '${record.sourcePath}' is outside an allowed skill root.`,
        );
      const body = yield* Effect.tryPromise({
        try: () => NodeFS.readFile(sourcePath, "utf8"),
        catch: () =>
          new SkillRegistryError({ kind: "read-failed", message: `Could not read skill '${id}'.` }),
      });
      bodyCache.set(id, { body, expiresAt: Date.now() + BODY_CACHE_TTL_MS });
      return { id, contentHash: record.contentHash, body };
    });

  const bridge: SkillExecutionBridge = {
    compile: (input) =>
      Effect.gen(function* () {
        const selected: RegisteredSkill[] = [];
        const seenBodies = new Set<string>();
        for (const id of input.skillIds) {
          const record = records.get(id);
          if (!record) return yield* fail("not-found", `Skill '${id}' was not found.`);
          if (!record.enabled || seenBodies.has(record.contentHash)) continue;
          seenBodies.add(record.contentHash);
          selected.push(record);
        }
        const compiledBodies = yield* Effect.forEach(selected, (record) => readBody(record.id));
        const context = [
          "RUNE skill execution context",
          `Provider dialect: ${input.provider}`,
          ...(input.platformCapabilities?.length
            ? [`Platform capabilities: ${input.platformCapabilities.join(", ")}`]
            : []),
          ...(input.activeGoal ? [`Active goal: ${input.activeGoal}`] : []),
        ].join("\n");
        return {
          skills: selected.map(toWire),
          sourceDirectories: [
            ...new Set(selected.map((skill) => NodePath.dirname(skill.sourcePath))),
          ],
          compiledPrompt: [
            context,
            ...compiledBodies.map(
              (entry) => `\n## Skill: ${records.get(entry.id)?.name ?? entry.id}\n${entry.body}`,
            ),
          ].join("\n"),
        } satisfies SkillExecutionProjection;
      }),
  };

  return {
    list: Effect.gen(function* () {
      if (records.size === 0) return yield* refresh;
      return {
        version: registryVersion,
        skills: [...records.values()]
          .map(toWire)
          .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
      } satisfies SkillRegistrySnapshot;
    }),
    refresh,
    getBody: readBody,
    bridge,
  };
};

export const SkillRegistryLive = Layer.effect(
  SkillRegistry,
  Effect.gen(function* () {
    const config = yield* ServerConfig;
    const registry = makeSkillRegistry({ projectCwd: config.cwd });
    yield* registry.refresh;
    return registry;
  }),
);
