import * as Schema from "effect/Schema";

import {
  CapsuleReferenceId,
  ClaimId,
  IsoDateTime,
  MessageId,
  NonNegativeInt,
  PositiveInt,
  ProjectId,
  ThreadId,
  TrimmedNonEmptyString,
  TrimmedString,
  TurnId,
} from "./baseSchemas.ts";

export const CROSS_THREAD_WS_METHODS = {
  listForPicker: "thread.listForPicker",
  capsulePreview: "thread.capsule.preview",
  capsuleExpand: "thread.capsule.expand",
} as const;

export const ClaimKind = Schema.Literals([
  "decision",
  "finding",
  "test_result",
  "file",
  "pattern",
  "avoidance",
  "instruction",
]);
export type ClaimKind = typeof ClaimKind.Type;

export const ClaimRefKind = Schema.Literals([
  "file",
  "file_read",
  "symbol",
  "test",
  "commit",
  "message",
]);
export type ClaimRefKind = typeof ClaimRefKind.Type;

const CLAIM_TEXT_MAX_CHARS = 2000;

export const ClaimRef = Schema.Struct({
  kind: ClaimRefKind,
  value: TrimmedNonEmptyString.check(Schema.isMaxLength(1024)),
  lineRange: Schema.optionalKey(Schema.Tuple([PositiveInt, PositiveInt])),
});
export type ClaimRef = typeof ClaimRef.Type;

export const ClaimInvalidation = Schema.Struct({
  stale: Schema.Boolean,
  supersededBy: Schema.optionalKey(ClaimId),
  reason: Schema.optionalKey(TrimmedNonEmptyString.check(Schema.isMaxLength(500))),
});
export type ClaimInvalidation = typeof ClaimInvalidation.Type;

export const Claim = Schema.Struct({
  id: ClaimId,
  threadId: ThreadId,
  turnId: TurnId,
  messageIds: Schema.Array(MessageId).check(Schema.isMinLength(1)),
  kind: ClaimKind,
  text: TrimmedNonEmptyString.check(Schema.isMaxLength(CLAIM_TEXT_MAX_CHARS)),
  refs: Schema.Array(ClaimRef),
  confidence: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 })),
  // test_result claims only: did the test pass? Copied from the backing
  // test_result activity, never model-judged.
  verified: Schema.optionalKey(Schema.Boolean),
  extractionModel: TrimmedNonEmptyString.check(Schema.isMaxLength(200)),
  extractedAt: NonNegativeInt,
  invalidation: ClaimInvalidation,
});
export type Claim = typeof Claim.Type;

export const ClaimDigest = Schema.Struct({
  id: ClaimId,
  kind: ClaimKind,
  text: TrimmedNonEmptyString.check(Schema.isMaxLength(CLAIM_TEXT_MAX_CHARS)),
  refs: Schema.Array(ClaimRef),
  confidence: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 })),
  verified: Schema.optionalKey(Schema.Boolean),
  invalidation: ClaimInvalidation,
  expandHint: Schema.Struct({ messageId: MessageId }),
});
export type ClaimDigest = typeof ClaimDigest.Type;

const THREAD_TITLE_MAX_CHARS = 500;

export const ThreadContextCapsule = Schema.Struct({
  threadId: ThreadId,
  threadTitle: TrimmedNonEmptyString.check(Schema.isMaxLength(THREAD_TITLE_MAX_CHARS)),
  // Metadata only, for the agent's awareness. The capsule body is harness-neutral.
  threadHarness: TrimmedNonEmptyString.check(Schema.isMaxLength(100)),
  projectId: ProjectId,
  generatedAt: NonNegativeInt,
  tokenCount: NonNegativeInt,
  claims: Schema.Array(ClaimDigest),
  source: Schema.Struct({
    turnIds: Schema.Array(TurnId),
    messageIdRanges: Schema.Array(Schema.Tuple([MessageId, MessageId])),
  }),
});
export type ThreadContextCapsule = typeof ThreadContextCapsule.Type;

// The audit rows are deliberately not inside MultiCapsule: each
// CapsuleReference already snapshots deliveredCapsule, so embedding references
// here would duplicate the same bytes twice and hand the agent audit data it
// never reasons over. MultiCapsule is the delivered payload; CapsuleReference
// is the persisted audit row.
export const MultiCapsule = Schema.Struct({
  capsules: Schema.Array(ThreadContextCapsule),
  totalTokens: NonNegativeInt,
});
export type MultiCapsule = typeof MultiCapsule.Type;

export const CapsuleReference = Schema.Struct({
  id: CapsuleReferenceId,
  turnId: TurnId,
  threadId: ThreadId,
  threadTitle: TrimmedNonEmptyString.check(Schema.isMaxLength(THREAD_TITLE_MAX_CHARS)),
  threadHarness: TrimmedNonEmptyString.check(Schema.isMaxLength(100)),
  projectId: ProjectId,
  claimIds: Schema.Array(ClaimId),
  tokenCount: NonNegativeInt,
  expandedClaimIds: Schema.Array(ClaimId),
  deliveredCapsule: ThreadContextCapsule,
  createdAt: IsoDateTime,
});
export type CapsuleReference = typeof CapsuleReference.Type;

export const ExpandRange = Schema.Struct({
  before: NonNegativeInt,
  after: NonNegativeInt,
});
export type ExpandRange = typeof ExpandRange.Type;

export const ExpandRequest = Schema.Struct({
  // The thread the expansion is requested from; the server re-checks the
  // same-project boundary against the source thread.
  activeThreadId: ThreadId,
  threadId: ThreadId,
  messageId: MessageId,
  range: Schema.optionalKey(ExpandRange),
});
export type ExpandRequest = typeof ExpandRequest.Type;

export const ExpandResponse = Schema.Struct({
  threadId: ThreadId,
  threadHarness: TrimmedNonEmptyString.check(Schema.isMaxLength(100)),
  // The ProviderRuntimeEvent.raw payload. Null when the raw was not preserved
  // (pre-feature threads, or messages over the preservation cap).
  rawEvent: Schema.NullOr(Schema.Unknown),
  text: Schema.String,
  degraded: Schema.Boolean,
  tokenCount: NonNegativeInt,
  claimIdsCovered: Schema.Array(ClaimId),
});
export type ExpandResponse = typeof ExpandResponse.Type;

export const CapsulePreviewRequest = Schema.Struct({
  activeThreadId: ThreadId,
  threadId: ThreadId,
  // The active composer text, for ranking context.
  query: TrimmedString.check(Schema.isMaxLength(8000)),
});
export type CapsulePreviewRequest = typeof CapsulePreviewRequest.Type;

const CAPTURE_PREVIEW_TOP_CLAIMS = 3;

export const CapsulePreviewResponse = Schema.Struct({
  threadId: ThreadId,
  threadTitle: TrimmedNonEmptyString.check(Schema.isMaxLength(THREAD_TITLE_MAX_CHARS)),
  // Claims that would pass the budget fitter's floor rules.
  claimCount: NonNegativeInt,
  tokenEstimate: NonNegativeInt,
  topClaimTexts: Schema.Array(TrimmedNonEmptyString).check(
    Schema.isMaxLength(CAPTURE_PREVIEW_TOP_CLAIMS),
  ),
});
export type CapsulePreviewResponse = typeof CapsulePreviewResponse.Type;

export const ThreadPickerEntry = Schema.Struct({
  threadId: ThreadId,
  projectId: ProjectId,
  title: TrimmedNonEmptyString.check(Schema.isMaxLength(THREAD_TITLE_MAX_CHARS)),
  harness: TrimmedNonEmptyString.check(Schema.isMaxLength(100)),
  updatedAt: IsoDateTime,
});
export type ThreadPickerEntry = typeof ThreadPickerEntry.Type;

export const ThreadListForPickerInput = Schema.Struct({
  // The thread the user is composing in; the picker result set is scoped to
  // this thread's project (server-enforced same-project boundary).
  activeThreadId: ThreadId,
  query: TrimmedString.check(Schema.isMaxLength(200)),
  limit: Schema.optionalKey(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 50 }))),
});
export type ThreadListForPickerInput = typeof ThreadListForPickerInput.Type;

export const ThreadListForPickerResult = Schema.Struct({
  matches: Schema.Array(ThreadPickerEntry),
});
export type ThreadListForPickerResult = typeof ThreadListForPickerResult.Type;

export class CrossThreadError extends Schema.TaggedErrorClass<CrossThreadError>()(
  "CrossThreadError",
  {
    message: TrimmedNonEmptyString,
    reason: Schema.Literals([
      "cross_project_reference",
      "source_thread_deleted",
      "source_thread_archived",
      "budget_exceeded",
      "claim_not_found",
    ]),
    cause: Schema.optional(Schema.Defect()),
  },
) {}
