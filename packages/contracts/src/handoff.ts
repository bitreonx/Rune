/** Durable, compact state for continuing a Mission on another runtime. */
import * as Schema from "effect/Schema";

import { IsoDateTime, NonNegativeInt, TrimmedNonEmptyString } from "./baseSchemas.ts";
import { WorkspaceFileRef } from "./workspaceFileRef.ts";

export const EvidenceRef = Schema.Struct({
  id: TrimmedNonEmptyString,
  kind: Schema.Literals(["test", "build", "file", "diff", "runtime", "manual"]),
  summary: TrimmedNonEmptyString,
  source: Schema.optionalKey(TrimmedNonEmptyString),
  at: Schema.optionalKey(IsoDateTime),
});
export type EvidenceRef = typeof EvidenceRef.Type;

export const VerificationReceipt = Schema.Struct({
  id: TrimmedNonEmptyString,
  command: TrimmedNonEmptyString,
  status: Schema.Literals(["passed", "failed", "blocked", "not-run"]),
  summary: TrimmedNonEmptyString,
  durationMs: Schema.optionalKey(NonNegativeInt),
  at: IsoDateTime,
});
export type VerificationReceipt = typeof VerificationReceipt.Type;

/**
 * The minimum state a destination runtime needs to resume a Mission. This is
 * intentionally not a transcript export: messages, credentials, absolute
 * auth paths, and provider-private context do not belong in a capsule.
 */
export const HandoffCapsule = Schema.Struct({
  missionId: TrimmedNonEmptyString,
  objective: TrimmedNonEmptyString,
  acceptance: Schema.Array(TrimmedNonEmptyString),
  completedTaskIds: Schema.Array(TrimmedNonEmptyString),
  currentTaskId: Schema.optionalKey(TrimmedNonEmptyString),
  verifiedFacts: Schema.Array(EvidenceRef),
  failedHypotheses: Schema.Array(TrimmedNonEmptyString),
  changedFiles: Schema.Array(WorkspaceFileRef),
  verification: Schema.Array(VerificationReceipt),
  nextAction: Schema.optionalKey(TrimmedNonEmptyString),
});
export type HandoffCapsule = typeof HandoffCapsule.Type;
