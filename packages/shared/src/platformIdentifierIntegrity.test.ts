// @effect-diagnostics nodeBuiltinImport:off - this test intentionally scans source text.
import { expect, it } from "vite-plus/test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const sourceRoots = ["apps", "packages", "scripts"];
const sourceExtensions = new Set([
  ".c",
  ".cc",
  ".cjs",
  ".cpp",
  ".h",
  ".hh",
  ".hpp",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".m",
  ".mjs",
  ".mm",
  ".swift",
  ".ts",
  ".tsx",
]);
const corruptedPlatformIdentifier =
  /\b(?:get|set|read|write)?(?:UInrune2?(?:BE|LE)?|Inrune2?(?:BE|LE)?|Floarune2?|xorshifrune2?|Floarune2?Array|Uinrune2?Array|inrune2?|uinrune2?|floarune2?)\b/iu;

function collectSourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (
      [
        ".git",
        ".next",
        ".rune",
        "coverage",
        "dist",
        "dist-electron",
        "node_modules",
        "vendor",
      ].includes(entry.name)
    ) {
      continue;
    }
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(path));
    } else if (sourceExtensions.has(path.slice(path.lastIndexOf(".")))) {
      files.push(path);
    }
  }
  return files;
}

it("contains no mechanically corrupted platform identifiers", () => {
  const matches = sourceRoots
    .flatMap((root) => collectSourceFiles(resolve(workspaceRoot, root)))
    .filter((path) => !path.endsWith("platformIdentifierIntegrity.test.ts"))
    .flatMap((path) => {
      const contents = readFileSync(path, "utf8");
      return corruptedPlatformIdentifier.test(contents) ? [relative(workspaceRoot, path)] : [];
    });

  expect(matches).toEqual([]);
});
