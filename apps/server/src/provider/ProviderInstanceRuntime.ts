// @effect-diagnostics nodeBuiltinImport:off
import { createHash } from "node:crypto";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import {
  ProviderInstanceId,
  ProviderInstanceEnvironmentVariableName,
  type ProviderDriverKind,
  type ProviderInstanceConfig,
  type ProviderInstanceEnvironment,
  type ProviderInstanceEnvironmentVariable,
  type ProviderInstanceRuntimeHomePolicy,
  type ProviderInstanceRuntimeManifest,
  type ServiceConnectionProtocol,
} from "@rune/contracts";

const ROUTING_ENVIRONMENT_NAMES = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BASE_URL",
  "CLAUDE_CONFIG_DIR",
  "CODEX_HOME",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENROUTER_API_KEY",
  "XAI_API_KEY",
] as const;
const VALID_ENVIRONMENT_VARIABLE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const hash = (value: string): string => createHash("sha256").update(value).digest("hex");

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readString = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const applyEnvironment = (
  target: NodeJS.ProcessEnv,
  variables: ProviderInstanceEnvironment | undefined,
): void => {
  for (const variable of variables ?? []) {
    target[variable.name] = variable.value;
  }
};

const toOverrides = (variables: Map<string, ProviderInstanceEnvironmentVariable>) =>
  Array.from(variables.values()).sort((left, right) => left.name.localeCompare(right.name));

export interface CompiledProviderInstanceRuntime {
  /** Effective environment retained for deterministic tests and diagnostics. */
  readonly environment: NodeJS.ProcessEnv;
  /** Minimal override list passed to existing provider drivers. */
  readonly environmentOverrides: ProviderInstanceEnvironment;
  readonly manifest: ProviderInstanceRuntimeManifest;
}

export interface CompileProviderInstanceRuntimeInput {
  readonly instanceId: ProviderInstanceId;
  readonly driver: ProviderDriverKind;
  readonly entry: ProviderInstanceConfig;
  readonly typedConfig?: unknown;
  readonly baseEnvironment?: NodeJS.ProcessEnv;
  readonly serviceEnvironment?: ProviderInstanceEnvironment;
  readonly mandatoryEnvironment?: ProviderInstanceEnvironment;
  readonly cwd?: string;
  /** Supplied by the Effect boundary so compilation remains deterministic. */
  readonly generatedAt: string;
  readonly isolatedHomeRoot?: string;
  readonly protocol?: ServiceConnectionProtocol;
  readonly compatibilityProfileVersion?: string;
  readonly modelBindings?: Readonly<Record<string, string>>;
}

/**
 * Compile one instance's launch inputs with an explicit precedence order.
 * Existing drivers still consume their historical environment-array input;
 * managed instances receive scrub entries for inherited provider variables so
 * the old merge helper cannot reintroduce another instance's credentials.
 */
export const compileProviderInstanceRuntime = (
  input: CompileProviderInstanceRuntimeInput,
): CompiledProviderInstanceRuntime => {
  const typedConfig = asRecord(input.typedConfig);
  const authMode = input.entry.authMode ?? "native";
  const runtimeHomePolicy: ProviderInstanceRuntimeHomePolicy =
    input.entry.runtimeHomePolicy ?? "native";
  const baseEnvironment = { ...(input.baseEnvironment ?? process.env) };
  const overrideMap = new Map<string, ProviderInstanceEnvironmentVariable>();

  // Managed instances must not inherit provider credentials or routing URLs.
  // Empty values are intentional: the existing driver merge helper applies
  // them over process.env without requiring changes in each adapter.
  if (
    authMode === "rune-managed" ||
    runtimeHomePolicy === "isolated" ||
    input.entry.connectionId !== undefined
  ) {
    for (const name of ROUTING_ENVIRONMENT_NAMES) {
      delete baseEnvironment[name];
      overrideMap.set(name, { name, value: "", sensitive: false });
    }
  }

  // Lower-to-higher precedence: process, service, explicit instance, then
  // mandatory compatibility variables.
  applyEnvironment(baseEnvironment, input.serviceEnvironment);
  for (const variable of input.serviceEnvironment ?? []) overrideMap.set(variable.name, variable);
  applyEnvironment(baseEnvironment, input.entry.environment);
  for (const variable of input.entry.environment ?? []) overrideMap.set(variable.name, variable);
  applyEnvironment(baseEnvironment, input.mandatoryEnvironment);
  for (const variable of input.mandatoryEnvironment ?? [])
    overrideMap.set(variable.name, variable);

  const binaryPath = readString(typedConfig, "binaryPath");
  const configuredHome = readString(typedConfig, "homePath");
  const configHome =
    runtimeHomePolicy === "isolated"
      ? NodePath.join(
          input.isolatedHomeRoot ?? NodePath.join(NodeOS.homedir(), ".rune", "provider-instances"),
          String(input.instanceId),
        )
      : configuredHome;
  if (runtimeHomePolicy === "isolated" && configHome !== undefined) {
    // The external harnesses must receive the same isolated home that is
    // recorded in the manifest. This is the execution boundary; merely
    // reporting an isolated path would still allow native config bleed.
    const homeVariable =
      input.driver === "claudeAgent"
        ? "CLAUDE_CONFIG_DIR"
        : input.driver === "codex"
          ? "CODEX_HOME"
          : undefined;
    if (homeVariable !== undefined) {
      const variable = {
        name: homeVariable,
        value: configHome,
        sensitive: false,
      } satisfies ProviderInstanceEnvironmentVariable;
      overrideMap.set(homeVariable, variable);
    }
  }
  const environmentOverrides = toOverrides(overrideMap) as ProviderInstanceEnvironment;
  const effectiveEnvironment = { ...baseEnvironment };
  // The override list is applied once more to make the compiler's effective
  // environment exactly match what the legacy driver merge receives.
  applyEnvironment(effectiveEnvironment, environmentOverrides);

  const environmentEntries = Object.entries(effectiveEnvironment)
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && VALID_ENVIRONMENT_VARIABLE_NAME.test(entry[0]),
    )
    .sort(([left], [right]) => left.localeCompare(right));
  const environmentHash = hash(environmentEntries.map(([name, value]) => `${name}=${value}`).join("\n"));
  const generatedAt = input.generatedAt;
  const manifestBase = {
    manifestVersion: 1 as const,
    instanceId: input.instanceId,
    driver: input.driver,
    ...(input.entry.connectionId !== undefined ? { connectionId: input.entry.connectionId } : {}),
    ...((input.protocol ?? input.entry.protocol) !== undefined
      ? { protocol: input.protocol ?? input.entry.protocol }
      : {}),
    ...(binaryPath !== undefined ? { binaryPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
    ...(configHome !== undefined ? { configHome } : {}),
    runtimeHomePolicy,
    ...(input.entry.modelProfileId !== undefined
      ? { modelProfileId: input.entry.modelProfileId }
      : {}),
    modelBindings: { ...(input.modelBindings ?? input.entry.modelBindings ?? {}) },
    environmentKeys: environmentEntries.map(([name]) =>
      ProviderInstanceEnvironmentVariableName.make(name),
    ),
    environmentHash,
    credentialSource:
      input.entry.connectionId !== undefined
        ? ("service-credential" as const)
        : authMode === "native"
          ? ("native" as const)
          : environmentEntries.some(([name]) => name.endsWith("_API_KEY") || name.endsWith("_TOKEN"))
            ? ("environment" as const)
            : ("none" as const),
    ...(input.entry.compatibilityProfileId !== undefined
      ? { compatibilityProfileId: input.entry.compatibilityProfileId }
      : {}),
    ...((input.compatibilityProfileVersion ?? input.entry.compatibilityProfileVersion) !== undefined
      ? {
          compatibilityProfileVersion:
            input.compatibilityProfileVersion ?? input.entry.compatibilityProfileVersion,
        }
      : {}),
    generatedAt,
  } satisfies Omit<ProviderInstanceRuntimeManifest, "fingerprint">;
  const { generatedAt: _generatedAt, ...manifestIdentity } = manifestBase;
  const fingerprint = hash(JSON.stringify(manifestIdentity));

  return {
    environment: effectiveEnvironment,
    environmentOverrides,
    manifest: { ...manifestBase, fingerprint },
  };
};
