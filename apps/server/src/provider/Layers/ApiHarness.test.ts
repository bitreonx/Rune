import { describe, expect, it } from "@effect/vitest";

import {
  ApiHarnessLedger,
  compileOutcomeContract,
  parseVerificationObservation,
  type ApiHarnessToolObservation,
} from "./ApiHarness.ts";

describe("ApiHarnessLedger", () => {
  it("compiles an explicit outcome without treating the request as proof", () => {
    const contract = compileOutcomeContract(`
Build the workspace inspector.

- Add a bounded workspace snapshot.
- Add focused verification.
Must preserve remote connections.
`);

    expect(contract.objective).toBe("Build the workspace inspector.");
    expect(contract.deliverables).toEqual([
      "Add a bounded workspace snapshot.",
      "Add focused verification.",
    ]);
    expect(contract.constraints).toEqual(["Must preserve remote connections."]);

    const ledger = new ApiHarnessLedger(contract);
    expect(ledger.snapshot().verification).toBe("unverified");
    expect(ledger.promptSummary()).toContain("Do not claim the task is complete");
  });

  it("accepts only a passing verification observation as proof and invalidates it after mutation", () => {
    const ledger = new ApiHarnessLedger(compileOutcomeContract("Improve the workspace."));

    ledger.recordToolObservation({
      toolName: "run_checks",
      observation: "check focused tests exit 0",
      verificationTool: true,
    });
    expect(ledger.snapshot().verification).toBe("verified");

    ledger.recordToolObservation({
      toolName: "edit_file",
      observation: "Edited src/index.ts",
      invalidatesVerification: true,
    });

    const snapshot = ledger.snapshot();
    expect(snapshot.verification).toBe("unverified");
    expect(snapshot.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "verification", status: "invalidated" }),
      ]),
    );
  });

  it("does not promote an ordinary successful tool response into verification", () => {
    const ledger = new ApiHarnessLedger(compileOutcomeContract("Inspect the workspace."));
    const observation: ApiHarnessToolObservation = {
      toolName: "bash",
      observation: "done",
    };

    ledger.recordToolObservation(observation);

    expect(ledger.snapshot().verification).toBe("unverified");
    expect(ledger.snapshot().evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "tool", status: "observed", label: "bash" }),
      ]),
    );
  });

  it("turns bounded check output into a repair-ready failure capsule", () => {
    const result = parseVerificationObservation(
      "check 1: pnpm test exit 1\nFAIL src/widget.test.ts\nAuthorization: Bearer secret",
    );

    expect(result.status).toBe("failed");
    expect(result.failure).toMatchObject({
      version: 1,
      category: "verification",
      expected: "Every focused check exits with code 0.",
      actual: "Check 1 exited with code 1.",
      nextAction: "Repair the failure, then rerun the same focused check.",
    });
    expect(result.failure?.evidence).toContain("[redacted]");
    expect(result.failure?.evidence).not.toContain("secret");
  });

  it("never marks verification as passed without explicit exit codes", () => {
    expect(parseVerificationObservation("tests look good").status).toBe("unavailable");
    expect(
      parseVerificationObservation("check 1: test exit 0\ncheck 2: typecheck exit 0").status,
    ).toBe("passed");
  });

  it("exposes the latest failure to the next model round", () => {
    const ledger = new ApiHarnessLedger(compileOutcomeContract("Repair the widget."));
    ledger.recordToolObservation({
      toolName: "run_checks",
      observation: "check 1: test exit 1\nFAIL widget",
      verificationTool: true,
    });

    expect(ledger.snapshot().latestFailure?.actual).toBe("Check 1 exited with code 1.");
    expect(ledger.promptSummary()).toContain("Repair the failure");
  });
});
