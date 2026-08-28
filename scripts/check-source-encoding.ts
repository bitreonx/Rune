// @effect-diagnostics nodeBuiltinImport:off globalConsole:off - This is a small host-side source check.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
]);

const fromCodePoints = (...codePoints: ReadonlyArray<number>): string =>
  String.fromCodePoint(...codePoints);

export const MOJIBAKE_MARKERS = [
  fromCodePoints(0xe2, 0x20ac),
  fromCodePoints(0xe2, 0x20ac, 0x2122),
  fromCodePoints(0xe2, 0x20ac, 0x153),
  fromCodePoints(0xe2, 0x20ac, 0xa6),
  fromCodePoints(0xc3),
  fromCodePoints(0xc2),
  fromCodePoints(0xf0, 0x178),
  fromCodePoints(0xef, 0xbf, 0xbd),
  fromCodePoints(0xfffd),
] as const;

export interface MojibakeFinding {
  readonly path: string;
  readonly marker: string;
  readonly line: number;
  readonly column: number;
}

const isTextPath = (filePath: string): boolean => TEXT_EXTENSIONS.has(NodePath.extname(filePath));

const walk = (root: string): ReadonlyArray<string> => {
  if (!NodeFS.existsSync(root)) return [];
  const paths: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of NodeFS.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = NodePath.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
          continue;
        }
        visit(entryPath);
      } else if (entry.isFile() && isTextPath(entryPath)) {
        paths.push(entryPath);
      }
    }
  };
  visit(root);
  return paths;
};

export const findMojibake = (roots: ReadonlyArray<string>): ReadonlyArray<MojibakeFinding> => {
  const findings: MojibakeFinding[] = [];
  for (const root of roots) {
    for (const filePath of walk(root)) {
      const source = NodeFS.readFileSync(filePath, "utf8");
      for (const marker of MOJIBAKE_MARKERS) {
        const offset = source.indexOf(marker);
        if (offset === -1) continue;
        const line = source.slice(0, offset).split("\n").length;
        const lastLineBreak = source.lastIndexOf("\n", offset - 1);
        findings.push({ path: filePath, marker, line, column: offset - lastLineBreak });
      }
    }
  }
  return findings;
};

const main = (): void => {
  const repoRoot = NodePath.resolve(import.meta.dirname, "..");
  const findings = findMojibake(
    ["apps", "packages", "scripts"].map((directory) => NodePath.join(repoRoot, directory)),
  );
  if (findings.length === 0) {
    console.log("Source encoding check passed.");
    return;
  }
  for (const finding of findings) {
    console.error(
      `${NodePath.relative(repoRoot, finding.path)}:${finding.line}:${finding.column} contains ${JSON.stringify(finding.marker)}`,
    );
  }
  process.exitCode = 1;
};

if (import.meta.main) main();
