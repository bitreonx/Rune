import type { ActionOutput, ActionVerificationRequirement } from "@rune/contracts";

export type ActionVerificationOutcome = "passed" | "failed" | "unavailable";

export interface ActionVerificationObservation {
  readonly commandSucceeded: boolean;
  /** Redacted/capped terminal text may be used as a last-resort observation. */
  readonly outputText?: string;
  /** File or artifact checks performed by the runtime, keyed by target/name. */
  readonly outputExists?: ReadonlyMap<string, boolean>;
}

export interface ActionVerificationResult {
  readonly requirement: ActionVerificationRequirement;
  readonly outcome: ActionVerificationOutcome;
  readonly reason: string;
}

function outputTarget(
  requirement: ActionVerificationRequirement,
  outputs: ReadonlyArray<ActionOutput>,
): string | undefined {
  const target = requirement.target?.trim();
  if (target === undefined || target.length === 0) return undefined;
  const declared = outputs.find((output) => output.name === target || output.pattern === target);
  return declared?.pattern ?? target;
}

/**
 * Verifies only the evidence actually supplied by the runtime. Missing
 * observations remain `unavailable`; callers can report that honestly rather
 * than treating a successful process exit as proof that an artifact exists.
 */
export function verifyActionRequirements(input: {
  readonly requirements: ReadonlyArray<ActionVerificationRequirement>;
  readonly outputs?: ReadonlyArray<ActionOutput>;
  readonly observation: ActionVerificationObservation;
}): ReadonlyArray<ActionVerificationResult> {
  const outputs = input.outputs ?? [];
  return input.requirements.map((requirement) => {
    if (requirement.kind === "command-succeeded") {
      return {
        requirement,
        outcome: input.observation.commandSucceeded ? "passed" : "failed",
        reason: input.observation.commandSucceeded
          ? "The correlated command exited successfully."
          : "The correlated command did not exit successfully.",
      } satisfies ActionVerificationResult;
    }

    const target = outputTarget(requirement, outputs);
    if (target === undefined) {
      return {
        requirement,
        outcome: "unavailable",
        reason: "The output requirement does not identify a verifiable target.",
      } satisfies ActionVerificationResult;
    }
    const explicitObservation = input.observation.outputExists?.get(target);
    if (explicitObservation !== undefined) {
      return {
        requirement,
        outcome: explicitObservation ? "passed" : "failed",
        reason: explicitObservation
          ? "The declared output exists."
          : "The declared output was not found.",
      } satisfies ActionVerificationResult;
    }
    const outputText = input.observation.outputText;
    if (outputText !== undefined) {
      const matched = outputText.includes(target);
      return {
        requirement,
        outcome: matched ? "passed" : "failed",
        reason: matched
          ? "The declared output was observed in redacted terminal evidence."
          : "The declared output was not observed in redacted terminal evidence.",
      } satisfies ActionVerificationResult;
    }
    return {
      requirement,
      outcome: "unavailable",
      reason: "No output evidence was available for this requirement.",
    } satisfies ActionVerificationResult;
  });
}
