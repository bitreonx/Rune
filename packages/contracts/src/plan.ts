import * as Schema from "effect/Schema";

import {
  IsoDateTime,
  NonNegativeInt,
  PositiveInt,
  ThreadId,
  TrimmedNonEmptyString,
} from "./baseSchemas.ts";
import { ProviderInstanceId } from "./providerInstance.ts";

// Plan ids are intentionally opaque. Their stable construction lives in the
// shared package, while the contract only constrains their durable shape.
export const PlanSessionId = TrimmedNonEmptyString.pipe(Schema.brand("PlanSessionId"));
export type PlanSessionId = typeof PlanSessionId.Type;

export const PlanQuestionId = TrimmedNonEmptyString.pipe(Schema.brand("PlanQuestionId"));
export type PlanQuestionId = typeof PlanQuestionId.Type;

export const PlanRequirementId = TrimmedNonEmptyString.pipe(Schema.brand("PlanRequirementId"));
export type PlanRequirementId = typeof PlanRequirementId.Type;

export const PlanTaskId = TrimmedNonEmptyString.pipe(Schema.brand("PlanTaskId"));
export type PlanTaskId = typeof PlanTaskId.Type;

export const PlanStage = Schema.Literals([
  "ask",
  "spec",
  "plan",
  "planning",
  "reviewing-plan",
  "approved",
  "executing",
  "reviewing-result",
  "completed",
  "paused",
  "blocked",
]);
export type PlanStage = typeof PlanStage.Type;

/** Planning depth is a policy choice, not a provider identity. */
export const PlanMode = Schema.Literals(["quick", "guided", "deep", "discovery-map"]);
export type PlanMode = typeof PlanMode.Type;

export const PlanDecisionSource = Schema.Literals(["user", "repository", "policy"]);
export type PlanDecisionSource = typeof PlanDecisionSource.Type;

export const PlanRole = Schema.Literals([
  "planner",
  "researcher",
  "critic",
  "orchestrator",
  "executor",
  "reviewer",
  "verifier",
]);
export type PlanRole = typeof PlanRole.Type;

export const PlanWorkspacePolicy = Schema.Literals(["shared", "isolated", "read-only"]);
export type PlanWorkspacePolicy = typeof PlanWorkspacePolicy.Type;

/** Provider-neutral role binding. A plan never depends on one vendor. */
export const PlanRoleBinding = Schema.Struct({
  role: PlanRole,
  harnessKind: TrimmedNonEmptyString,
  providerInstanceId: ProviderInstanceId,
  modelId: Schema.optionalKey(TrimmedNonEmptyString),
  effort: Schema.optionalKey(TrimmedNonEmptyString),
  skillProfileId: Schema.optionalKey(TrimmedNonEmptyString),
  workspacePolicy: Schema.optionalKey(PlanWorkspacePolicy),
  requestBudget: Schema.optionalKey(PositiveInt),
});
export type PlanRoleBinding = typeof PlanRoleBinding.Type;

export const PlanRoleBindingPolicy = Schema.Struct({
  role: PlanRole,
  providerInstanceId: Schema.optionalKey(ProviderInstanceId),
  modelId: Schema.optionalKey(TrimmedNonEmptyString),
  workspacePolicy: Schema.optionalKey(PlanWorkspacePolicy),
  requestBudget: Schema.optionalKey(PositiveInt),
});
export type PlanRoleBindingPolicy = typeof PlanRoleBindingPolicy.Type;

export const PlanVerificationPolicy = Schema.Struct({
  commands: Schema.Array(TrimmedNonEmptyString),
  requirePassing: Schema.Boolean,
  allowProviderReview: Schema.Boolean,
});
export type PlanVerificationPolicy = typeof PlanVerificationPolicy.Type;

export const PlanQuestionOption = Schema.Struct({
  id: TrimmedNonEmptyString,
  label: TrimmedNonEmptyString,
});
export type PlanQuestionOption = typeof PlanQuestionOption.Type;

/** A question is a decision node; dependencies identify prerequisite decisions. */
export const PlanQuestion = Schema.Struct({
  id: PlanQuestionId,
  prompt: TrimmedNonEmptyString,
  order: NonNegativeInt,
  required: Schema.Boolean,
  dependencyIds: Schema.Array(PlanQuestionId),
  options: Schema.optional(Schema.Array(PlanQuestionOption)),
});
export type PlanQuestion = typeof PlanQuestion.Type;

export const PlanAnswerValue = TrimmedNonEmptyString;
export type PlanAnswerValue = typeof PlanAnswerValue.Type;

export const PlanAnswer = Schema.Struct({
  questionId: PlanQuestionId,
  value: PlanAnswerValue,
  source: PlanDecisionSource,
  answeredAt: IsoDateTime,
  rationale: Schema.optionalKey(TrimmedNonEmptyString),
  confidence: Schema.optionalKey(Schema.Number),
});
export type PlanAnswer = typeof PlanAnswer.Type;

export const PlanRequirement = Schema.Struct({
  id: PlanRequirementId,
  statement: TrimmedNonEmptyString,
  acceptanceCriteria: Schema.Array(TrimmedNonEmptyString),
});
export type PlanRequirement = typeof PlanRequirement.Type;

/** Structured truth for the spec; markdown can be a later projection. */
export const PlanSpecArtifact = Schema.Struct({
  goal: TrimmedNonEmptyString,
  context: Schema.String,
  requirements: Schema.Array(PlanRequirement),
  constraints: Schema.Array(TrimmedNonEmptyString),
  nonGoals: Schema.Array(TrimmedNonEmptyString),
  verificationStrategy: Schema.Array(TrimmedNonEmptyString),
  openQuestions: Schema.Array(TrimmedNonEmptyString),
  updatedAt: IsoDateTime,
  userExperience: Schema.optionalKey(Schema.String),
  nonFunctionalRequirements: Schema.optionalKey(Schema.Array(TrimmedNonEmptyString)),
  architectureConstraints: Schema.optionalKey(Schema.Array(TrimmedNonEmptyString)),
  terminology: Schema.optionalKey(Schema.Array(TrimmedNonEmptyString)),
  failureRecovery: Schema.optionalKey(Schema.Array(TrimmedNonEmptyString)),
  acceptanceCriteria: Schema.optionalKey(Schema.Array(TrimmedNonEmptyString)),
  assumptions: Schema.optionalKey(Schema.Array(TrimmedNonEmptyString)),
});
export type PlanSpecArtifact = typeof PlanSpecArtifact.Type;

export const PlanTaskState = Schema.Literals([
  "pending",
  "ready",
  "running",
  "blocked",
  "completed",
  "failed",
  "skipped",
]);
export type PlanTaskState = typeof PlanTaskState.Type;

/** Tasks contain no provider or executor fields; those belong to orchestration. */
export const PlanTask = Schema.Struct({
  id: PlanTaskId,
  title: TrimmedNonEmptyString,
  outcome: TrimmedNonEmptyString,
  order: NonNegativeInt,
  dependencyIds: Schema.Array(PlanTaskId),
  requirementIds: Schema.Array(PlanRequirementId),
  verification: Schema.Array(TrimmedNonEmptyString),
  state: PlanTaskState,
  rationale: Schema.optionalKey(TrimmedNonEmptyString),
  likelyFiles: Schema.optionalKey(Schema.Array(TrimmedNonEmptyString)),
  ownershipScope: Schema.optionalKey(Schema.Array(TrimmedNonEmptyString)),
  risk: Schema.optionalKey(Schema.Literals(["low", "medium", "high"])),
  executionProfile: Schema.optionalKey(PlanRoleBinding),
  workspacePolicy: Schema.optionalKey(PlanWorkspacePolicy),
  skillIds: Schema.optionalKey(Schema.Array(TrimmedNonEmptyString)),
  verificationRequirements: Schema.optionalKey(Schema.Array(TrimmedNonEmptyString)),
  /** Set by BUILD when this task has been delegated to a real child thread. */
  workerThreadId: Schema.optionalKey(ThreadId),
});
export type PlanTask = typeof PlanTask.Type;

export const PlanDependencyEdge = Schema.Struct({
  taskId: PlanTaskId,
  dependsOn: PlanTaskId,
});
export type PlanDependencyEdge = typeof PlanDependencyEdge.Type;

/** A normalized, durable projection of task dependencies. */
export const PlanDependencyGraph = Schema.Struct({
  taskIds: Schema.Array(PlanTaskId),
  edges: Schema.Array(PlanDependencyEdge),
});
export type PlanDependencyGraph = typeof PlanDependencyGraph.Type;

/** Inspectable structural history for meaningful plan revisions. */
export const PlanRevision = Schema.Struct({
  version: PositiveInt,
  stage: PlanStage,
  summary: TrimmedNonEmptyString,
  specification: Schema.NullOr(PlanSpecArtifact),
  tasks: Schema.Array(PlanTask),
  dependencyGraph: PlanDependencyGraph,
  changedAt: IsoDateTime,
});
export type PlanRevision = typeof PlanRevision.Type;

export const PlanSession = Schema.Struct({
  id: PlanSessionId,
  threadId: ThreadId,
  goalId: Schema.optionalKey(TrimmedNonEmptyString),
  mode: PlanMode,
  stage: PlanStage,
  questions: Schema.Array(PlanQuestion),
  answers: Schema.Array(PlanAnswer),
  specification: Schema.NullOr(PlanSpecArtifact),
  tasks: Schema.Array(PlanTask),
  dependencyGraph: PlanDependencyGraph,
  planner: Schema.optionalKey(PlanRoleBinding),
  researcherPolicy: Schema.optionalKey(PlanRoleBindingPolicy),
  critic: Schema.optionalKey(Schema.NullOr(PlanRoleBinding)),
  executorPolicy: Schema.optionalKey(PlanRoleBindingPolicy),
  reviewerPolicy: Schema.optionalKey(PlanRoleBindingPolicy),
  /** Stable read-only child thread used for the post-BUILD review stage. */
  reviewThreadId: Schema.optionalKey(ThreadId),
  verifierPolicy: Schema.optionalKey(PlanVerificationPolicy),
  glossary: Schema.optionalKey(Schema.Array(TrimmedNonEmptyString)),
  approvals: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        id: TrimmedNonEmptyString,
        kind: Schema.Literals(["plan", "build", "review"]),
        approvedAt: IsoDateTime,
        approvedBy: TrimmedNonEmptyString,
      }),
    ),
  ),
  revisionHistory: Schema.optionalKey(Schema.Array(PlanRevision)),
  lifecycleReason: Schema.optionalKey(TrimmedNonEmptyString),
  version: PositiveInt,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type PlanSession = typeof PlanSession.Type;

export const PlanSessionValidationIssueCode = Schema.Literals([
  "duplicate-id",
  "duplicate-order",
  "unknown-dependency",
  "self-dependency",
  "duplicate-dependency",
  "dependency-order",
  "cycle",
  "unknown-question",
  "duplicate-answer",
  "unanswered-question",
  "missing-specification",
  "missing-requirements",
  "missing-tasks",
  "unmapped-requirement",
  "missing-verification",
  "open-question",
  "stale-dependency-graph",
  "stage",
]);
export type PlanSessionValidationIssueCode = typeof PlanSessionValidationIssueCode.Type;

export const PlanSessionValidationIssue = Schema.Struct({
  code: PlanSessionValidationIssueCode,
  path: TrimmedNonEmptyString,
  message: TrimmedNonEmptyString,
});
export type PlanSessionValidationIssue = typeof PlanSessionValidationIssue.Type;

export const PlanSessionCreateInput = Schema.Struct({
  session: PlanSession,
});
export type PlanSessionCreateInput = typeof PlanSessionCreateInput.Type;

/** Both selectors are optional for compatibility; the server requires one. */
export const PlanSessionGetInput = Schema.Struct({
  id: Schema.optionalKey(PlanSessionId),
  threadId: Schema.optionalKey(ThreadId),
});
export type PlanSessionGetInput = typeof PlanSessionGetInput.Type;

export const PlanSessionUpdateInput = Schema.Struct({
  session: PlanSession,
  expectedVersion: Schema.optionalKey(PositiveInt),
});
export type PlanSessionUpdateInput = typeof PlanSessionUpdateInput.Type;

export const PlanSessionTransitionInput = Schema.Struct({
  id: PlanSessionId,
  nextStage: PlanStage,
  expectedVersion: Schema.optionalKey(PositiveInt),
});
export type PlanSessionTransitionInput = typeof PlanSessionTransitionInput.Type;

export const PlanSessionResumeInput = Schema.Struct({
  id: PlanSessionId,
  resumeStage: Schema.Literals([
    "ask",
    "spec",
    "plan",
    "planning",
    "reviewing-plan",
    "approved",
    "executing",
    "reviewing-result",
  ]),
  expectedVersion: Schema.optionalKey(PositiveInt),
});
export type PlanSessionResumeInput = typeof PlanSessionResumeInput.Type;

export const PlanSessionScheduleInput = Schema.Struct({
  id: PlanSessionId,
  expectedVersion: Schema.optionalKey(PositiveInt),
  /** Provider instances currently available to accept worker turns. */
  availableProviderInstanceIds: Schema.Array(ProviderInstanceId),
  maxConcurrent: Schema.optionalKey(PositiveInt),
});
export type PlanSessionScheduleInput = typeof PlanSessionScheduleInput.Type;

export const PlanTaskSchedule = Schema.Struct({
  taskId: PlanTaskId,
  workerThreadId: ThreadId,
  workspacePolicy: PlanWorkspacePolicy,
});
export type PlanTaskSchedule = typeof PlanTaskSchedule.Type;

export const PlanTaskScheduleBlock = Schema.Struct({
  taskId: PlanTaskId,
  reason: Schema.Literals([
    "dependency",
    "provider-unavailable",
    "workspace-conflict",
    "capacity",
    "already-running",
  ]),
  blockingTaskIds: Schema.Array(PlanTaskId),
});
export type PlanTaskScheduleBlock = typeof PlanTaskScheduleBlock.Type;

export const PlanSessionScheduleResult = Schema.Struct({
  session: PlanSession,
  scheduled: Schema.Array(PlanTaskSchedule),
  blocked: Schema.Array(PlanTaskScheduleBlock),
});
export type PlanSessionScheduleResult = typeof PlanSessionScheduleResult.Type;

export const PlanSessionReviewInput = Schema.Struct({
  id: PlanSessionId,
  expectedVersion: Schema.optionalKey(PositiveInt),
  /** Reviewer instances currently available to accept the read-only review turn. */
  availableProviderInstanceIds: Schema.Array(ProviderInstanceId),
});
export type PlanSessionReviewInput = typeof PlanSessionReviewInput.Type;

export const PlanSessionReviewResult = Schema.Struct({
  session: PlanSession,
  reviewerThreadId: ThreadId,
  started: Schema.Boolean,
});
export type PlanSessionReviewResult = typeof PlanSessionReviewResult.Type;

export const PlanSessionErrorCode = Schema.Literals([
  "invalid-input",
  "not-found",
  "already-exists",
  "invalid-session",
  "invalid-transition",
  "version-conflict",
  "persistence-failed",
  "workspace-conflict",
  "execution-failed",
]);
export type PlanSessionErrorCode = typeof PlanSessionErrorCode.Type;

export class PlanSessionError extends Schema.TaggedErrorClass<PlanSessionError>()(
  "PlanSessionError",
  {
    code: PlanSessionErrorCode,
    operation: TrimmedNonEmptyString,
    message: TrimmedNonEmptyString,
    id: Schema.optionalKey(PlanSessionId),
    threadId: Schema.optionalKey(ThreadId),
    issues: Schema.optionalKey(Schema.Array(PlanSessionValidationIssue)),
  },
) {}

/** Compatibility name for callers that use the operation-oriented wording. */
export const PlanSessionOperationError = PlanSessionError;
export type PlanSessionOperationError = PlanSessionError;
