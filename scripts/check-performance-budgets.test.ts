// @effect-diagnostics nodeBuiltinImport:off - Tests exercise the host-side source check directly.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { findPerformanceBudgetViolations } from "./check-performance-budgets.ts";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) NodeFS.rmSync(root, { recursive: true, force: true });
});

function fixtureRoot(): string {
  const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "rune-performance-check-"));
  tempRoots.push(root);
  return root;
}

function writeFixture(root: string, relativePath: string, source: string): void {
  const target = NodePath.join(root, relativePath);
  NodeFS.mkdirSync(NodePath.dirname(target), { recursive: true });
  NodeFS.writeFileSync(target, source, "utf8");
}

describe("performance budget check", () => {
  it("accepts canonical values at or below the release limits", () => {
    const root = fixtureRoot();
    writeFixture(
      root,
      "apps/server/src/provider/Layers/ApiExecutionPolicy.ts",
      `maxProviderRequests: 4\nmaxTransportRetries: 1\nmaxConcurrentSafeTools: 8\nmaxObservationChars: 48_000\nmaxPatchBytes: 2_000_000`,
    );
    writeFixture(root, "packages/client-runtime/src/state/turnTrace.ts", "maxTurns = 12");
    writeFixture(
      root,
      "scripts/build-desktop-artifact.ts",
      "WINDOWS_PACKAGED_PAYLOAD_FILE_LIMIT = 80",
    );

    expect(findPerformanceBudgetViolations(root)).toEqual([]);
  });

  it("reports widened limits and missing source values", () => {
    const root = fixtureRoot();
    writeFixture(
      root,
      "apps/server/src/provider/Layers/ApiExecutionPolicy.ts",
      "maxProviderRequests: 5\nmaxTransportRetries: 1\nmaxConcurrentSafeTools: 8\nmaxObservationChars: 48_000\nmaxPatchBytes: 2_000_000",
    );
    writeFixture(
      root,
      "packages/client-runtime/src/state/turnTrace.ts",
      "export function trace() {}",
    );
    writeFixture(
      root,
      "scripts/build-desktop-artifact.ts",
      "WINDOWS_PACKAGED_PAYLOAD_FILE_LIMIT = 80",
    );

    expect(
      findPerformanceBudgetViolations(root).map(({ key, actual }) => ({ key, actual })),
    ).toEqual([
      { key: "maxProviderRequests", actual: 5 },
      { key: "maxVisibleTraceTurns", actual: null },
    ]);
  });
});
