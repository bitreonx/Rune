// @effect-diagnostics nodeBuiltinImport:off globalConsole:off - This is a small host-side source check.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

export interface VerificationSurfaceFinding {
  readonly path: string;
  readonly message: string;
}

const REQUIRED_FILES = [
  "scripts/check-source-encoding.ts",
  "scripts/check-source-encoding.test.ts",
  "scripts/check-performance-budgets.ts",
  "scripts/check-performance-budgets.test.ts",
  "scripts/build-desktop-artifact.ts",
  "scripts/build-desktop-artifact.test.ts",
  "scripts/release-smoke.ts",
  "apps/desktop/scripts/smoke-test.mjs",
  "apps/server/src/provider/Layers/ApiRequestBudget.test.ts",
  "packages/client-runtime/src/state/turnTrace.test.ts",
] as const;

const REQUIRED_ROOT_SCRIPTS = [
  "check:encoding",
  "check:performance",
  "check:verification-surfaces",
  "icons:check",
  "test:desktop-smoke",
  "release:smoke",
  "dist:desktop:win:x64",
] as const;

const REQUIRED_CI_MARKERS = [
  "Check source encoding",
  "Check performance budgets",
  "Check verification surfaces",
  "Desktop smoke",
  "Release smoke",
  "Build desktop pipeline",
] as const;

function readJson(path: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(NodeFS.readFileSync(path, "utf8"));
    return parsed !== null && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function findVerificationSurfaceViolations(
  repositoryRoot: string,
): ReadonlyArray<VerificationSurfaceFinding> {
  const findings: VerificationSurfaceFinding[] = [];
  for (const relativePath of REQUIRED_FILES) {
    if (!NodeFS.existsSync(NodePath.join(repositoryRoot, relativePath))) {
      findings.push({
        path: relativePath,
        message: "required focused verification surface is missing",
      });
    }
  }

  const rootPackage = readJson(NodePath.join(repositoryRoot, "package.json"));
  const scripts = rootPackage?.scripts;
  for (const scriptName of REQUIRED_ROOT_SCRIPTS) {
    if (scripts === null || typeof scripts !== "object" || !(scriptName in scripts)) {
      findings.push({ path: "package.json", message: `missing root script ${scriptName}` });
    }
  }

  const ciPath = NodePath.join(repositoryRoot, ".github/workflows/ci.yml");
  if (!NodeFS.existsSync(ciPath)) {
    findings.push({ path: ".github/workflows/ci.yml", message: "CI workflow is missing" });
  } else {
    const ci = NodeFS.readFileSync(ciPath, "utf8");
    for (const marker of REQUIRED_CI_MARKERS) {
      if (!ci.includes(marker))
        findings.push({ path: ".github/workflows/ci.yml", message: `missing CI gate: ${marker}` });
    }
    if (ci.includes("@runetools/")) {
      findings.push({
        path: ".github/workflows/ci.yml",
        message: "CI uses stale @runetools package filters",
      });
    }
  }

  for (const workflowPath of walkWorkflows(NodePath.join(repositoryRoot, ".github/workflows"))) {
    if (NodeFS.readFileSync(workflowPath, "utf8").includes("@runetools/")) {
      findings.push({
        path: NodePath.relative(repositoryRoot, workflowPath),
        message: "workflow uses stale @runetools package filters; package names are @rune/*",
      });
    }
  }
  return findings;
}

function walkWorkflows(directory: string): ReadonlyArray<string> {
  if (!NodeFS.existsSync(directory)) return [];
  return NodeFS.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = NodePath.join(directory, entry.name);
    if (entry.isDirectory()) return walkWorkflows(path);
    return entry.isFile() && /\.ya?ml$/u.test(entry.name) ? [path] : [];
  });
}

function main(): void {
  const repositoryRoot = NodePath.resolve(import.meta.dirname, "..");
  const findings = findVerificationSurfaceViolations(repositoryRoot);
  if (findings.length === 0) {
    console.log(`Verification surface check passed (${REQUIRED_FILES.length} focused surfaces).`);
    return;
  }
  for (const finding of findings) console.error(`${finding.path}: ${finding.message}`);
  process.exitCode = 1;
}

if (import.meta.main) main();
