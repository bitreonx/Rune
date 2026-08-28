import * as Schema from "effect/Schema";

import { IsoDateTime, NonNegativeInt, PositiveInt, TrimmedNonEmptyString } from "./baseSchemas.ts";

const ACTION_ID_MAX_LENGTH = 128;
const ACTION_NAME_MAX_LENGTH = 200;
const ACTION_COMMAND_MAX_LENGTH = 16_384;
const ACTION_PARAMETER_NAME_MAX_LENGTH = 64;

/** Stable, provider-neutral id used by `run_action(...)`. */
export const ActionId = TrimmedNonEmptyString.check(
  Schema.isMaxLength(ACTION_ID_MAX_LENGTH),
  Schema.isPattern(/^action\.[a-z0-9][a-z0-9-]*$/),
);
export type ActionId = typeof ActionId.Type;

export const ActionScope = Schema.Literals(["project", "workspace", "global"]);
export type ActionScope = typeof ActionScope.Type;

export const ActionKind = Schema.Literals(["command", "recipe", "agent", "automation"]);
export type ActionKind = typeof ActionKind.Type;

export const ActionSource = Schema.Literals([
  "built-in",
  "discovered",
  "learned",
  "user-created",
  "imported",
]);
export type ActionSource = typeof ActionSource.Type;

export const ActionParameterType = Schema.Literals([
  "string",
  "number",
  "integer",
  "boolean",
  "enum",
  "path",
  "branch",
  "semver",
  "secret-reference",
]);
export type ActionParameterType = typeof ActionParameterType.Type;

export const ActionParameterValue = Schema.Union(Schema.String, Schema.Number, Schema.Boolean);
export type ActionParameterValue = typeof ActionParameterValue.Type;

export const ActionParameter = Schema.Struct({
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(ACTION_PARAMETER_NAME_MAX_LENGTH)),
  type: ActionParameterType,
  required: Schema.Boolean,
  description: Schema.optionalKey(TrimmedNonEmptyString),
  defaultValue: Schema.optionalKey(ActionParameterValue),
  enumValues: Schema.optionalKey(Schema.Array(TrimmedNonEmptyString)),
  /** Secret values are never valid recipe data; only a credential reference is stored. */
  secret: Schema.optionalKey(Schema.Boolean),
});
export type ActionParameter = typeof ActionParameter.Type;

export const ActionParameterValues = Schema.Record(Schema.String, ActionParameterValue);
export type ActionParameterValues = typeof ActionParameterValues.Type;

export const ActionCapability = Schema.Literals([
  "filesystem-read",
  "filesystem-write",
  "git-commit",
  "git-push",
  "network",
  "package-install",
  "deploy",
  "delete",
  "production-migration",
  "secret-reference",
]);
export type ActionCapability = typeof ActionCapability.Type;

export const ActionPreconditionKind = Schema.Literals([
  "repository-available",
  "clean-or-acknowledged-worktree",
  "required-toolchain-available",
  "compatible-platform",
]);
export type ActionPreconditionKind = typeof ActionPreconditionKind.Type;

export const ActionPrecondition = Schema.Struct({
  id: TrimmedNonEmptyString,
  kind: ActionPreconditionKind,
  description: TrimmedNonEmptyString,
  blocking: Schema.Boolean,
});
export type ActionPrecondition = typeof ActionPrecondition.Type;

export const ActionStep = Schema.Struct({
  id: TrimmedNonEmptyString,
  name: TrimmedNonEmptyString,
  kind: Schema.Literal("run-command"),
  /** Parameter placeholders use `{{name}}` and must not be pre-quoted. */
  command: TrimmedNonEmptyString.check(Schema.isMaxLength(ACTION_COMMAND_MAX_LENGTH)),
  capabilities: Schema.optionalKey(Schema.Array(ActionCapability)),
});
export type ActionStep = typeof ActionStep.Type;

export const ActionOutput = Schema.Struct({
  name: TrimmedNonEmptyString,
  kind: Schema.Literals(["file", "url", "value"]),
  pattern: Schema.optionalKey(TrimmedNonEmptyString),
});
export type ActionOutput = typeof ActionOutput.Type;

export const ActionVerificationRequirement = Schema.Struct({
  kind: Schema.Literals(["command-succeeded", "output-exists"]),
  target: Schema.optionalKey(TrimmedNonEmptyString),
});
export type ActionVerificationRequirement = typeof ActionVerificationRequirement.Type;

export const ActionApprovalPolicy = Schema.Literals([
  "never",
  "on-dangerous-step",
  "always",
]);
export type ActionApprovalPolicy = typeof ActionApprovalPolicy.Type;

export const ActionFallbackPolicy = Schema.Literals(["none", "assisted-repair", "agent"]);
export type ActionFallbackPolicy = typeof ActionFallbackPolicy.Type;

export const ActionProvenance = Schema.Struct({
  source: TrimmedNonEmptyString,
  successfulRunIds: Schema.Array(TrimmedNonEmptyString),
  repositoryRevision: Schema.optionalKey(TrimmedNonEmptyString),
  createdFromThreadId: Schema.optionalKey(TrimmedNonEmptyString),
  createdFromTurnId: Schema.optionalKey(TrimmedNonEmptyString),
  approvedBy: Schema.optionalKey(TrimmedNonEmptyString),
});
export type ActionProvenance = typeof ActionProvenance.Type;

export const ActionCompatibilityFingerprint = Schema.Struct({
  osFamily: TrimmedNonEmptyString,
  packageManager: Schema.optionalKey(TrimmedNonEmptyString),
  toolVersions: Schema.optionalKey(Schema.Record(Schema.String, TrimmedNonEmptyString)),
  inputHashes: Schema.optionalKey(Schema.Record(Schema.String, TrimmedNonEmptyString)),
  outputPatterns: Schema.optionalKey(Schema.Array(TrimmedNonEmptyString)),
});
export type ActionCompatibilityFingerprint = typeof ActionCompatibilityFingerprint.Type;

export const RuneAction = Schema.Struct({
  id: ActionId,
  name: TrimmedNonEmptyString.check(Schema.isMaxLength(ACTION_NAME_MAX_LENGTH)),
  description: Schema.optionalKey(TrimmedNonEmptyString),
  scope: ActionScope,
  kind: ActionKind,
  source: ActionSource,
  intentSignatures: Schema.Array(TrimmedNonEmptyString),
  parameters: Schema.Array(ActionParameter),
  preconditions: Schema.Array(ActionPrecondition),
  steps: Schema.Array(ActionStep),
  outputs: Schema.Array(ActionOutput),
  verification: Schema.Array(ActionVerificationRequirement),
  approvalPolicy: ActionApprovalPolicy,
  fallbackPolicy: ActionFallbackPolicy,
  capabilities: Schema.Array(ActionCapability),
  provenance: ActionProvenance,
  compatibility: Schema.optionalKey(ActionCompatibilityFingerprint),
  version: PositiveInt,
  enabled: Schema.Boolean,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type RuneAction = typeof RuneAction.Type;

export const ActionProposalStatus = Schema.Literals([
  "proposed",
  "approved",
  "rejected",
  "dismissed",
]);
export type ActionProposalStatus = typeof ActionProposalStatus.Type;

export const ActionProposal = Schema.Struct({
  proposalId: TrimmedNonEmptyString,
  action: RuneAction,
  reason: TrimmedNonEmptyString,
  successfulRunIds: Schema.Array(TrimmedNonEmptyString),
  status: ActionProposalStatus,
  createdAt: IsoDateTime,
  decidedAt: Schema.optionalKey(IsoDateTime),
});
export type ActionProposal = typeof ActionProposal.Type;

export const ActionLifecycleState = Schema.Literals([
  "proposed",
  "approved",
  "enabled",
  "disabled",
  "running",
  "paused",
  "succeeded",
  "failed",
]);
export type ActionLifecycleState = typeof ActionLifecycleState.Type;

export const ActionLifecycleEvent = Schema.Struct({
  actionId: ActionId,
  runId: Schema.optionalKey(TrimmedNonEmptyString),
  state: ActionLifecycleState,
  at: IsoDateTime,
  reason: Schema.optionalKey(TrimmedNonEmptyString),
});
export type ActionLifecycleEvent = typeof ActionLifecycleEvent.Type;

export const ActionEvidence = Schema.Struct({
  id: TrimmedNonEmptyString,
  actionId: ActionId,
  runId: TrimmedNonEmptyString,
  kind: Schema.Literals(["activity", "stdout", "stderr", "verification", "trace"]),
  summary: TrimmedNonEmptyString,
  redacted: Schema.Boolean,
  at: IsoDateTime,
});
export type ActionEvidence = typeof ActionEvidence.Type;

export const ActionTraceEvent = Schema.Struct({
  actionId: ActionId,
  runId: TrimmedNonEmptyString,
  turnId: Schema.optionalKey(TrimmedNonEmptyString),
  phase: Schema.Literals([
    "requested",
    "approval-required",
    "started",
    "step-started",
    "evidence",
    "succeeded",
    "failed",
  ]),
  summary: TrimmedNonEmptyString,
  command: Schema.optionalKey(TrimmedNonEmptyString),
  parameters: ActionParameterValues,
  modelCalls: NonNegativeInt,
  at: IsoDateTime,
});
export type ActionTraceEvent = typeof ActionTraceEvent.Type;

export const ActionStepReceipt = Schema.Struct({
  stepId: TrimmedNonEmptyString,
  status: Schema.Literals(["pending", "running", "succeeded", "failed"]),
  startedAt: Schema.optionalKey(IsoDateTime),
  completedAt: Schema.optionalKey(IsoDateTime),
  exitCode: Schema.optionalKey(Schema.NullOr(Schema.Int)),
  evidenceIds: Schema.Array(TrimmedNonEmptyString),
});
export type ActionStepReceipt = typeof ActionStepReceipt.Type;

export const ActionRunReceipt = Schema.Struct({
  runId: TrimmedNonEmptyString,
  actionId: ActionId,
  actionVersion: PositiveInt,
  status: Schema.Literals([
    "approval-required",
    "blocked",
    "started",
    "succeeded",
    "failed",
    "cancelled",
  ]),
  threadId: Schema.optionalKey(TrimmedNonEmptyString),
  turnId: Schema.optionalKey(TrimmedNonEmptyString),
  /** Always redacted; never the raw invocation map. */
  parameters: ActionParameterValues,
  modelCalls: NonNegativeInt,
  steps: Schema.Array(ActionStepReceipt),
  evidence: Schema.Array(ActionEvidence),
  startedAt: Schema.optionalKey(IsoDateTime),
  completedAt: Schema.optionalKey(IsoDateTime),
});
export type ActionRunReceipt = typeof ActionRunReceipt.Type;
