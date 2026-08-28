/**
 * Provider-neutral policy for editing or deleting a historical message.
 *
 * This module only resolves intent. It never rewinds a conversation, restores
 * files, forks a provider session, or mutates the mutation ledger. Callers are
 * responsible for presenting the resolved choice and applying its effects
 * through the canonical checkpoint/ownership machinery.
 */

export const HISTORICAL_MUTATION_CHOICES = [
  "rewind-and-restore",
  "keep-files-rerun",
  "keep-and-send-new",
  "cancel",
] as const;

export type HistoricalMutationChoice = (typeof HISTORICAL_MUTATION_CHOICES)[number];

export type HistoricalMutationOperation = "edit" | "delete";

export interface HistoricalMutationContext {
  /** Whether the operation edits or deletes the historical prompt. */
  readonly operation: HistoricalMutationOperation;
  /** Whether messages or assistant execution exist after the target prompt. */
  readonly hasDescendantMessages: boolean;
  /** Whether the target branch owns file mutations after the target prompt. */
  readonly hasOwnedFileChanges: boolean;
  /** Whether queued prompts are attached to the branch after the target prompt. */
  readonly hasQueuedPrompts: boolean;
  /** Whether a descendant turn is still executing. */
  readonly hasActiveDescendant: boolean;
}

export interface HistoricalMutationImpact {
  readonly hasDescendantMessages: boolean;
  readonly hasOwnedFileChanges: boolean;
  readonly hasQueuedPrompts: boolean;
  readonly hasActiveDescendant: boolean;
  /** True when applying a historical mutation can affect later state. */
  readonly hasImpact: boolean;
}

export type HistoricalMutationResolutionSource = "explicit" | "safe-default" | "invalid-explicit";

export type HistoricalMutationResolutionReason =
  | "no-explicit-choice"
  | "impact-requires-explicit-choice"
  | "choice-not-supported-for-operation";

export type HistoricalMutationConversationPolicy =
  | "rewind-before-target"
  | "fork-from-target"
  | "retain-current"
  | "unchanged";

export type HistoricalMutationWorkspacePolicy =
  | "restore-thread-owned"
  | "retain-current"
  | "unchanged";

export type HistoricalMutationPromptPolicy = "rerun-edited" | "send-edited-as-new" | "none";

export type HistoricalMutationQueuedPromptPolicy =
  | "preserve-and-mark-needs-review"
  | "preserve"
  | "unchanged";

export interface HistoricalMutationPolicyResolution {
  readonly operation: HistoricalMutationOperation;
  readonly choice: HistoricalMutationChoice;
  readonly source: HistoricalMutationResolutionSource;
  readonly reason?: HistoricalMutationResolutionReason;
  readonly impact: HistoricalMutationImpact;
  /** Whether the UI should obtain an explicit destructive/branching choice. */
  readonly requiresExplicitChoice: boolean;
  /** Whether an active descendant must settle before this choice is applied. */
  readonly requiresActiveExecutionSettlement: boolean;
  readonly conversation: HistoricalMutationConversationPolicy;
  readonly workspace: HistoricalMutationWorkspacePolicy;
  readonly prompt: HistoricalMutationPromptPolicy;
  readonly queuedPrompts: HistoricalMutationQueuedPromptPolicy;
}

/** Runtime guard for choices received from persisted or IPC data. */
export function isHistoricalMutationChoice(value: unknown): value is HistoricalMutationChoice {
  return (
    typeof value === "string" && (HISTORICAL_MUTATION_CHOICES as readonly string[]).includes(value)
  );
}

/**
 * Delete can only rewind, while both edit-preserving choices require an edit.
 * `cancel` is valid for either operation and is always non-mutating.
 */
export function isHistoricalMutationChoiceSupported(
  operation: HistoricalMutationOperation,
  choice: HistoricalMutationChoice,
): boolean {
  return choice === "cancel" || choice === "rewind-and-restore" || operation === "edit";
}

export function summarizeHistoricalMutationImpact(
  context: HistoricalMutationContext,
): HistoricalMutationImpact {
  const impact = {
    hasDescendantMessages: context.hasDescendantMessages,
    hasOwnedFileChanges: context.hasOwnedFileChanges,
    hasQueuedPrompts: context.hasQueuedPrompts,
    hasActiveDescendant: context.hasActiveDescendant,
  };
  return {
    ...impact,
    hasImpact:
      impact.hasDescendantMessages ||
      impact.hasOwnedFileChanges ||
      impact.hasQueuedPrompts ||
      impact.hasActiveDescendant,
  };
}

/**
 * A historical delete is always an explicit operation. An edit needs the
 * structured choice surface only when it has descendants or owned state that
 * could otherwise become inconsistent.
 */
export function shouldRequestHistoricalMutationChoice(context: HistoricalMutationContext): boolean {
  return context.operation === "delete" || summarizeHistoricalMutationImpact(context).hasImpact;
}

/**
 * Fail-safe defaults deliberately never rewind files or discard history.
 * A no-impact edit can continue as a rerun; every destructive or branching
 * situation waits for a user choice and resolves to `cancel` until then.
 */
export function safeDefaultHistoricalMutationChoice(
  context: HistoricalMutationContext,
): HistoricalMutationChoice {
  return context.operation === "edit" && !shouldRequestHistoricalMutationChoice(context)
    ? "keep-files-rerun"
    : "cancel";
}

function effectsForChoice(
  operation: HistoricalMutationOperation,
  choice: HistoricalMutationChoice,
  impact: HistoricalMutationImpact,
): Pick<
  HistoricalMutationPolicyResolution,
  "requiresActiveExecutionSettlement" | "conversation" | "workspace" | "prompt" | "queuedPrompts"
> {
  switch (choice) {
    case "rewind-and-restore":
      return {
        requiresActiveExecutionSettlement: impact.hasActiveDescendant,
        conversation: "rewind-before-target",
        workspace: "restore-thread-owned",
        prompt: operation === "edit" ? "rerun-edited" : "none",
        queuedPrompts: impact.hasQueuedPrompts ? "preserve-and-mark-needs-review" : "unchanged",
      };
    case "keep-files-rerun":
      return {
        requiresActiveExecutionSettlement: impact.hasActiveDescendant,
        conversation: "fork-from-target",
        workspace: "retain-current",
        prompt: "rerun-edited",
        queuedPrompts: impact.hasQueuedPrompts ? "preserve" : "unchanged",
      };
    case "keep-and-send-new":
      return {
        requiresActiveExecutionSettlement: false,
        conversation: "retain-current",
        workspace: "retain-current",
        prompt: "send-edited-as-new",
        queuedPrompts: impact.hasQueuedPrompts ? "preserve" : "unchanged",
      };
    case "cancel":
      return {
        requiresActiveExecutionSettlement: false,
        conversation: "unchanged",
        workspace: "unchanged",
        prompt: "none",
        queuedPrompts: "unchanged",
      };
  }
}

function makeResolution(
  context: HistoricalMutationContext,
  impact: HistoricalMutationImpact,
  choice: HistoricalMutationChoice,
  source: HistoricalMutationResolutionSource,
  reason?: HistoricalMutationResolutionReason,
): HistoricalMutationPolicyResolution {
  return {
    operation: context.operation,
    choice,
    source,
    ...(reason === undefined ? {} : { reason }),
    impact,
    requiresExplicitChoice: shouldRequestHistoricalMutationChoice(context),
    ...effectsForChoice(context.operation, choice, impact),
  };
}

/**
 * Resolve a policy without side effects. Unknown choices are treated as an
 * invalid explicit decision and safely collapse to `cancel` rather than
 * accidentally selecting a rewind path.
 */
export function resolveHistoricalMutationPolicy(
  input: HistoricalMutationContext & { readonly explicitChoice?: unknown },
): HistoricalMutationPolicyResolution {
  const impact = summarizeHistoricalMutationImpact(input);
  const hasExplicitChoice = input.explicitChoice !== undefined && input.explicitChoice !== null;

  if (hasExplicitChoice) {
    if (
      isHistoricalMutationChoice(input.explicitChoice) &&
      isHistoricalMutationChoiceSupported(input.operation, input.explicitChoice)
    ) {
      return makeResolution(input, impact, input.explicitChoice, "explicit");
    }
    return makeResolution(
      input,
      impact,
      "cancel",
      "invalid-explicit",
      "choice-not-supported-for-operation",
    );
  }

  const choice = safeDefaultHistoricalMutationChoice(input);
  return makeResolution(
    input,
    impact,
    choice,
    "safe-default",
    shouldRequestHistoricalMutationChoice(input)
      ? "impact-requires-explicit-choice"
      : "no-explicit-choice",
  );
}
