// @effect-diagnostics nodeBuiltinImport:off globalConsole:off - This is a small host-side source check.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

export interface PerformanceBudgetFinding {
  readonly path: string;
  readonly key: string;
  readonly actual: number | null;
  readonly limit: number;
  readonly message: string;
}

interface NumericBudget {
  readonly relativePath: string;
  readonly key: string;
  readonly limit: number;
  readonly pattern: RegExp;
}

/**
 * These are release guardrails, not a second source of runtime configuration.
 * The check reads the canonical values and fails if a change silently widens a
 * request, trace, or packaged-payload bound.
 */
export const PERFORMANCE_BUDGETS = [
  {
    relativePath: "apps/server/src/provider/Layers/ApiExecutionPolicy.ts",
    key: "maxProviderRequests",
    limit: 4,
    pattern: /maxProviderRequests:\s*([0-9][0-9_]*)/u,
  },
  {
    relativePath: "apps/server/src/provider/Layers/ApiExecutionPolicy.ts",
    key: "maxTransportRetries",
    limit: 1,
    pattern: /maxTransportRetries:\s*([0-9][0-9_]*)/u,
  },
  {
    relativePath: "apps/server/src/provider/Layers/ApiExecutionPolicy.ts",
    key: "maxConcurrentSafeTools",
    limit: 8,
    pattern: /maxConcurrentSafeTools:\s*([0-9][0-9_]*)/u,
  },
  {
    relativePath: "apps/server/src/provider/Layers/ApiExecutionPolicy.ts",
    key: "maxObservationChars",
    limit: 48_000,
    pattern: /maxObservationChars:\s*([0-9][0-9_]*)/u,
  },
  {
    relativePath: "apps/server/src/provider/Layers/ApiExecutionPolicy.ts",
    key: "maxPatchBytes",
    limit: 2_000_000,
    pattern: /maxPatchBytes:\s*([0-9][0-9_]*)/u,
  },
  {
    relativePath: "packages/client-runtime/src/state/turnTrace.ts",
    key: "maxVisibleTraceTurns",
    limit: 12,
    pattern: /maxTurns\s*=\s*([0-9][0-9_]*)/u,
  },
  {
    relativePath: "scripts/build-desktop-artifact.ts",
    key: "windowsPackagedPayloadFileLimit",
    limit: 80,
    pattern: /WINDOWS_PACKAGED_PAYLOAD_FILE_LIMIT\s*=\s*([0-9][0-9_]*)/u,
  },
] as const satisfies ReadonlyArray<NumericBudget>;

function parseNumericBudget(source: string, budget: NumericBudget): number | null {
  const match = budget.pattern.exec(source);
  if (!match?.[1]) return null;
  return Number.parseInt(match[1].replaceAll("_", ""), 10);
}

export function findPerformanceBudgetViolations(
  repositoryRoot: string,
): ReadonlyArray<PerformanceBudgetFinding> {
  const findings: PerformanceBudgetFinding[] = [];
  for (const budget of PERFORMANCE_BUDGETS) {
    const filePath = NodePath.join(repositoryRoot, budget.relativePath);
    if (!NodeFS.existsSync(filePath)) {
      findings.push({
        path: budget.relativePath,
        key: budget.key,
        actual: null,
        limit: budget.limit,
        message: `Missing canonical budget source: ${budget.relativePath}`,
      });
      continue;
    }

    const actual = parseNumericBudget(NodeFS.readFileSync(filePath, "utf8"), budget);
    if (actual === null) {
      findings.push({
        path: budget.relativePath,
        key: budget.key,
        actual,
        limit: budget.limit,
        message: `Could not read ${budget.key} from ${budget.relativePath}`,
      });
      continue;
    }
    if (actual > budget.limit) {
      findings.push({
        path: budget.relativePath,
        key: budget.key,
        actual,
        limit: budget.limit,
        message: `${budget.key} is ${actual}, above the release limit ${budget.limit}`,
      });
    }
  }
  return findings;
}

function main(): void {
  const repositoryRoot = NodePath.resolve(import.meta.dirname, "..");
  const findings = findPerformanceBudgetViolations(repositoryRoot);
  if (findings.length === 0) {
    console.log(`Performance budget check passed (${PERFORMANCE_BUDGETS.length} guardrails).`);
    return;
  }
  for (const finding of findings) console.error(`${finding.path}: ${finding.message}`);
  process.exitCode = 1;
}

if (import.meta.main) main();
