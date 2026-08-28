// @effect-diagnostics nodeBuiltinImport:off - Tests exercise the host-side source check directly.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { findVerificationSurfaceViolations } from "./check-t18-verification.ts";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) NodeFS.rmSync(root, { recursive: true, force: true });
});

describe("T18 verification surface check", () => {
  it("reports missing focused surfaces, scripts, and CI gates deterministically", () => {
    const root = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "rune-t18-check-"));
    tempRoots.push(root);
    NodeFS.mkdirSync(NodePath.join(root, ".github/workflows"), { recursive: true });
    NodeFS.writeFileSync(
      NodePath.join(root, "package.json"),
      JSON.stringify({ scripts: {} }),
      "utf8",
    );
    NodeFS.writeFileSync(
      NodePath.join(root, ".github/workflows/ci.yml"),
      "uses: @runetools/desktop\n",
      "utf8",
    );

    const findings = findVerificationSurfaceViolations(root);
    expect(findings.some((finding) => finding.path === "package.json")).toBe(true);
    expect(findings.some((finding) => finding.message.includes("stale @runetools"))).toBe(true);
    expect(
      findings.some((finding) => finding.path === "scripts/check-performance-budgets.ts"),
    ).toBe(true);
  });
});
