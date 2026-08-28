import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import {
  CommandId,
  MessageId,
  PlanSessionError,
  RuntimeTaskId,
  ThreadId,
  type ModelSelection,
  type OrchestrationThread,
  type PlanSession,
  type PlanSessionScheduleInput,
  type PlanSessionScheduleResult,
  type PlanSessionReviewInput,
  type PlanSessionReviewResult,
  type PlanTask,
  type PlanTaskSchedule,
  type PlanTaskScheduleBlock,
} from "@rune/contracts";
import { schedulePlanTasks } from "@rune/shared/planScheduler";

import * as GitWorkflowService from "../git/GitWorkflowService.ts";
import * as OrchestrationEngine from "./Services/OrchestrationEngine.ts";
import * as ProjectionSnapshotQuery from "./Services/ProjectionSnapshotQuery.ts";
import * as PlanSessionService from "../persistence/Services/PlanSession.ts";
import { agentThreadIdFor, makeAgentThreadMetadata, runtimeTaskId } from "./agentThreads.ts";

const OPERATION = "PlanSession.schedule";
const isPlanSessionError = Schema.is(PlanSessionError);

export interface PlanExecutionCoordinatorShape {
  /**
   * Reserves the deterministic BUILD frontier and starts each selected task
   * in a real child thread. The reservation is persisted before provider
   * dispatch so a restart cannot silently run a task twice.
   */
  readonly schedule: (
    input: PlanSessionScheduleInput,
  ) => Effect.Effect<PlanSessionScheduleResult, PlanSessionError>;
  /** Starts one stable, read-only reviewer child for a completed BUILD. */
  readonly review: (
    input: PlanSessionReviewInput,
  ) => Effect.Effect<PlanSessionReviewResult, PlanSessionError>;
}

export class PlanExecutionCoordinator extends Context.Service<
  PlanExecutionCoordinator,
  PlanExecutionCoordinatorShape
>()("rune/orchestration/PlanExecutionCoordinator") {}

const makePlanExecutionCoordinator = Effect.gen(function* () {
  const planSessions = yield* PlanSessionService.PlanSession;
  const projection = yield* ProjectionSnapshotQuery.ProjectionSnapshotQuery;
  const orchestration = yield* OrchestrationEngine.OrchestrationEngineService;
  const gitWorkflow = yield* GitWorkflowService.GitWorkflowService;
  const crypto = yield* Crypto.Crypto;

  const nowIso = () => DateTime.now.pipe(Effect.map(DateTime.formatIso));
  const commandId = (scope: string) =>
    crypto.randomUUIDv4.pipe(Effect.map((uuid) => CommandId.make(`server:plan:${scope}:${uuid}`)));
  const messageId = (taskId: string) =>
    crypto.randomUUIDv4.pipe(Effect.map((uuid) => MessageId.make(`plan-task:${taskId}:${uuid}`)));

  const causeMessage = (cause: unknown): string => {
    if (cause instanceof Error && cause.message.trim() !== "") return cause.message;
    if (typeof cause === "object" && cause !== null && "message" in cause) {
      const message = (cause as { readonly message?: unknown }).message;
      if (typeof message === "string" && message.trim() !== "") return message;
    }
    return "The plan worker could not be started.";
  };

  const failure = (input: {
    readonly code: ConstructorParameters<typeof PlanSessionError>[0]["code"];
    readonly message: string;
    readonly id?: PlanSession["id"];
    readonly threadId?: ThreadId;
  }) =>
    new PlanSessionError({
      code: input.code,
      operation: OPERATION,
      message: input.message.trim() || "Plan execution failed.",
      ...(input.id === undefined ? {} : { id: input.id }),
      ...(input.threadId === undefined ? {} : { threadId: input.threadId }),
    });

  const getParentThread = (
    threadId: ThreadId,
  ): Effect.Effect<OrchestrationThread, PlanSessionError> =>
    projection.getThreadDetailById(threadId).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () =>
            Effect.fail(
              failure({
                code: "not-found",
                message: "The plan parent thread no longer exists.",
                threadId,
              }),
            ),
          onSome: Effect.succeed,
        }),
      ),
      Effect.mapError((cause) =>
        isPlanSessionError(cause)
          ? cause
          : failure({
              code: "persistence-failed",
              message: `Unable to load the plan parent thread: ${causeMessage(cause)}`,
              threadId,
            }),
      ),
    );

  const getProjectWorkspace = (projectId: OrchestrationThread["projectId"]) =>
    projection.getProjectShellById(projectId).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () =>
            Effect.fail(
              failure({
                code: "not-found",
                message: "The project for the plan parent thread no longer exists.",
              }),
            ),
          onSome: (project) => Effect.succeed(project.workspaceRoot),
        }),
      ),
      Effect.mapError((cause) =>
        isPlanSessionError(cause)
          ? cause
          : failure({
              code: "persistence-failed",
              message: `Unable to load the plan project: ${causeMessage(cause)}`,
            }),
      ),
    );

  const bindingForTask = (session: PlanSession, parent: OrchestrationThread, task: PlanTask) => {
    const profile = task.executionProfile;
    const policy = session.executorPolicy;
    const providerInstanceId =
      profile?.providerInstanceId ?? policy?.providerInstanceId ?? parent.modelSelection.instanceId;
    const modelSelection: ModelSelection = {
      instanceId: providerInstanceId,
      model: profile?.modelId ?? policy?.modelId ?? parent.modelSelection.model,
    };
    const workspacePolicy =
      task.workspacePolicy ?? profile?.workspacePolicy ?? policy?.workspacePolicy ?? "shared";
    return {
      modelSelection,
      workspacePolicy,
      role: profile?.role ?? "executor",
      profileId: profile?.skillProfileId ?? null,
    };
  };

  const blockFromScheduler = (block: {
    readonly task: PlanTask;
    readonly reason: PlanTaskScheduleBlock["reason"];
    readonly blockingTaskIds: ReadonlyArray<PlanTask["id"]>;
  }): PlanTaskScheduleBlock => ({
    taskId: block.task.id,
    reason: block.reason,
    blockingTaskIds: [...block.blockingTaskIds],
  });

  const reserveTask = (
    session: PlanSession,
    task: PlanTask,
    workerThreadId: ThreadId,
  ): Effect.Effect<PlanSession, PlanSessionError> => {
    const next: PlanSession = {
      ...session,
      tasks: session.tasks.map((candidate) =>
        candidate.id === task.id
          ? { ...candidate, state: "running" as const, workerThreadId }
          : candidate,
      ),
    };
    return planSessions.update({ session: next, expectedVersion: session.version });
  };

  const markTaskFailed = (session: PlanSession, taskId: PlanTask["id"], reason: string) => {
    const next: PlanSession = {
      ...session,
      tasks: session.tasks.map((candidate) =>
        candidate.id === taskId ? { ...candidate, state: "failed" as const } : candidate,
      ),
      lifecycleReason: reason,
    };
    return planSessions.update({ session: next, expectedVersion: session.version });
  };

  const provisionWorkspace = (input: {
    readonly policy: "shared" | "isolated" | "read-only";
    readonly projectWorkspace: string;
    readonly parent: OrchestrationThread;
    readonly branchName: string;
  }): Effect.Effect<
    { readonly branch: string | null; readonly worktreePath: string | null },
    PlanSessionError
  > => {
    if (input.policy !== "isolated") {
      return Effect.succeed({
        branch: input.parent.branch,
        worktreePath: input.parent.worktreePath,
      });
    }
    return gitWorkflow
      .createWorktree({
        cwd: input.projectWorkspace,
        refName: input.parent.branch ?? "HEAD",
        newRefName: input.branchName,
        ...(input.parent.branch === null ? {} : { baseRefName: input.parent.branch }),
        path: null,
      })
      .pipe(
        Effect.map((result) => ({
          branch: result.worktree.refName,
          worktreePath: result.worktree.path,
        })),
        Effect.mapError((cause) =>
          failure({
            code: "workspace-conflict",
            message: `Could not provision an isolated worktree: ${causeMessage(cause)}`,
          }),
        ),
      );
  };

  const dispatchWorker = (input: {
    readonly session: PlanSession;
    readonly parent: OrchestrationThread;
    readonly projectWorkspace: string;
    readonly task: PlanTask;
    readonly workerThreadId: ThreadId;
    readonly modelSelection: ModelSelection;
    readonly workspacePolicy: "shared" | "isolated" | "read-only";
    readonly role: string;
    readonly profileId: string | null;
  }) =>
    Effect.gen(function* () {
      const taskKey = `${input.session.id}:${input.task.id}`;
      const agentId = runtimeTaskId(`plan:${taskKey}`);
      const workspace = yield* provisionWorkspace({
        policy: input.workspacePolicy,
        projectWorkspace: input.projectWorkspace,
        parent: input.parent,
        branchName: `rune/plan/${input.session.id}/${input.task.id}`.replace(
          /[^A-Za-z0-9/_-]/gu,
          "-",
        ),
      });
      const agent = makeAgentThreadMetadata({
        parentThread: input.parent,
        agentId,
        role: input.role,
        profileId: input.profileId,
        objective: input.task.outcome,
        workspaceMode: input.workspacePolicy === "isolated" ? "isolated" : "shared",
      });
      const createdAt = yield* nowIso();
      yield* orchestration.dispatch({
        type: "thread.create",
        commandId: yield* commandId(`create:${taskKey}`),
        threadId: input.workerThreadId,
        projectId: input.parent.projectId,
        title: input.task.title,
        modelSelection: input.modelSelection,
        runtimeMode:
          input.workspacePolicy === "read-only" ? "approval-required" : input.parent.runtimeMode,
        interactionMode: input.parent.interactionMode,
        branch: workspace.branch,
        worktreePath: workspace.worktreePath,
        agent,
        createdAt,
      });
      yield* orchestration.dispatch({
        type: "thread.turn.start",
        commandId: yield* commandId(`start:${taskKey}`),
        threadId: input.workerThreadId,
        message: {
          messageId: yield* messageId(input.task.id),
          role: "user",
          text: [
            `You are executing plan task ${input.task.id}: ${input.task.title}.`,
            `Desired outcome: ${input.task.outcome}`,
            input.task.requirementIds.length > 0
              ? `Requirements: ${input.task.requirementIds.join(", ")}`
              : "Requirements: none explicitly mapped.",
            input.task.verification.length > 0
              ? `Verification: ${input.task.verification.join("; ")}`
              : "Verification: report the concrete checks you performed.",
            "Stay within the assigned ownership scope and report blockers as structured evidence.",
          ].join("\n\n"),
          attachments: [],
        },
        modelSelection: input.modelSelection,
        titleSeed: input.task.title,
        runtimeMode:
          input.workspacePolicy === "read-only" ? "approval-required" : input.parent.runtimeMode,
        interactionMode: input.parent.interactionMode,
        createdAt,
      });
    });

  const schedule = (input: PlanSessionScheduleInput) =>
    Effect.gen(function* () {
      let session = yield* planSessions.get({ id: input.id });
      if (input.expectedVersion !== undefined && session.version !== input.expectedVersion) {
        return yield* failure({
          code: "version-conflict",
          message: "The plan changed before BUILD could begin.",
          id: session.id,
          threadId: session.threadId,
        });
      }
      if (session.stage === "approved") {
        session = yield* planSessions.transition({
          id: session.id,
          nextStage: "executing",
          expectedVersion: session.version,
        });
      }
      if (session.stage !== "executing") {
        return yield* failure({
          code: "invalid-transition",
          message: `BUILD requires an approved plan; current stage is '${session.stage}'.`,
          id: session.id,
          threadId: session.threadId,
        });
      }

      const parent = yield* getParentThread(session.threadId);
      const projectWorkspace = yield* getProjectWorkspace(parent.projectId);
      const availableProviderIds = new Set(input.availableProviderInstanceIds);
      const taskBindings = new Map(
        session.tasks.map((task) => [task.id, bindingForTask(session, parent, task)]),
      );
      const availableTaskIds = new Set(
        session.tasks
          .filter((task) =>
            availableProviderIds.has(taskBindings.get(task.id)!.modelSelection.instanceId),
          )
          .map((task) => task.id),
      );
      const runningTaskIds = new Set(
        session.tasks.filter((task) => task.state === "running").map((task) => task.id),
      );
      const reservations = session.tasks
        .filter((task) => task.state === "running")
        .map((task) => ({
          taskId: task.id,
          ownershipScope: task.ownershipScope ?? [],
          workspacePolicy: task.workspacePolicy,
        }));
      const planned = schedulePlanTasks({
        tasks: session.tasks,
        availableTaskIds,
        runningTaskIds,
        reservations,
        ...(input.maxConcurrent === undefined ? {} : { maxConcurrent: input.maxConcurrent }),
      });
      const blocked = planned.blocked.map(blockFromScheduler);
      const scheduled: PlanTaskSchedule[] = [];

      for (const task of planned.runnable) {
        const binding = taskBindings.get(task.id)!;
        const workerThreadId = agentThreadIdFor(
          session.threadId,
          runtimeTaskId(`plan:${session.id}:${task.id}`),
        );
        session = yield* reserveTask(session, task, workerThreadId);
        yield* dispatchWorker({
          session,
          parent,
          projectWorkspace,
          task,
          workerThreadId,
          modelSelection: binding.modelSelection,
          workspacePolicy: binding.workspacePolicy,
          role: binding.role,
          profileId: binding.profileId,
        }).pipe(
          Effect.catch((cause) =>
            markTaskFailed(session, task.id, causeMessage(cause)).pipe(
              Effect.andThen(
                Effect.fail(
                  failure({
                    code: "execution-failed",
                    message: `Plan task '${task.id}' could not start: ${causeMessage(cause)}`,
                    id: session.id,
                    threadId: session.threadId,
                  }),
                ),
              ),
            ),
          ),
        );
        scheduled.push({
          taskId: task.id,
          workerThreadId,
          workspacePolicy: binding.workspacePolicy,
        });
      }
      return { session, scheduled, blocked };
    }).pipe(
      Effect.catch((cause) =>
        isPlanSessionError(cause)
          ? Effect.fail(cause)
          : Effect.fail(
              failure({ code: "execution-failed", message: causeMessage(cause), id: input.id }),
            ),
      ),
    );

  const review = (
    input: PlanSessionReviewInput,
  ): Effect.Effect<PlanSessionReviewResult, PlanSessionError> =>
    Effect.gen(function* () {
      let session = yield* planSessions.get({ id: input.id });
      if (input.expectedVersion !== undefined && session.version !== input.expectedVersion) {
        return yield* failure({
          code: "version-conflict",
          message: "The plan changed before REVIEW could begin.",
          id: session.id,
          threadId: session.threadId,
        });
      }
      if (session.stage !== "reviewing-result") {
        return yield* failure({
          code: "invalid-transition",
          message: `REVIEW requires a completed BUILD; current stage is '${session.stage}'.`,
          id: session.id,
          threadId: session.threadId,
        });
      }
      if (session.reviewThreadId !== undefined) {
        return { session, reviewerThreadId: session.reviewThreadId, started: false };
      }

      const parent = yield* getParentThread(session.threadId);
      const reviewerPolicy = session.reviewerPolicy;
      const providerInstanceId =
        reviewerPolicy?.providerInstanceId ??
        session.executorPolicy?.providerInstanceId ??
        parent.modelSelection.instanceId;
      if (!input.availableProviderInstanceIds.includes(providerInstanceId)) {
        return yield* failure({
          code: "execution-failed",
          message: "No available provider instance can run the read-only plan review.",
          id: session.id,
          threadId: session.threadId,
        });
      }
      const modelSelection: ModelSelection = {
        instanceId: providerInstanceId,
        model:
          reviewerPolicy?.modelId ?? session.executorPolicy?.modelId ?? parent.modelSelection.model,
      };
      const reviewerThreadId = agentThreadIdFor(
        session.threadId,
        runtimeTaskId(`plan:review:${session.id}:${session.version}`),
      );
      const reviewer = makeAgentThreadMetadata({
        parentThread: parent,
        agentId: runtimeTaskId(`plan:review:${session.id}:${session.version}`),
        role: "reviewer",
        objective: session.specification?.goal ?? "Review the completed plan work.",
        spawnedByTurnId: parent.latestTurn?.turnId ?? null,
        workspaceMode: "shared",
      });
      const createdAt = yield* nowIso();
      const reviewPrompt = [
        "You are the independent reviewer for a completed RUNE PlanSession.",
        "Use the assigned workspace in read-only mode. Do not edit files, commit, or start a second worker.",
        `Goal: ${session.specification?.goal ?? "Review the completed plan work."}`,
        "Requirements:",
        ...(session.specification?.requirements.map(
          (requirement) =>
            `- ${requirement.id}: ${requirement.statement} (${requirement.acceptanceCriteria.join("; ")})`,
        ) ?? ["- No structured requirements were recorded."]),
        "Tasks:",
        ...session.tasks.map(
          (task) => `- ${task.id} [${task.state}] ${task.title}: ${task.outcome}`,
        ),
        "Review separately for specification compliance and code quality. Report concrete evidence, failed checks, and blockers.",
      ]
        .join("\n")
        .slice(0, 120_000);
      const nextSession: PlanSession = {
        ...session,
        reviewThreadId: reviewerThreadId,
        lifecycleReason: "Independent plan review started.",
      };
      session = yield* planSessions.update({
        session: nextSession,
        expectedVersion: session.version,
      });
      yield* orchestration
        .dispatch({
          type: "thread.create",
          commandId: yield* commandId(`review:create:${session.id}`),
          threadId: reviewerThreadId,
          projectId: parent.projectId,
          title: `Review · ${parent.title}`,
          modelSelection,
          runtimeMode: "approval-required",
          interactionMode: "default",
          branch: parent.branch,
          worktreePath: parent.worktreePath,
          agent: reviewer,
          createdAt,
        })
        .pipe(
          Effect.catch((cause) =>
            Effect.gen(function* () {
              const { reviewThreadId: _reviewThreadId, ...retryableSession } = session;
              const restored = yield* planSessions.update({
                session: {
                  ...retryableSession,
                  lifecycleReason: `Review could not start: ${causeMessage(cause)}`,
                },
                expectedVersion: session.version,
              });
              yield* planSessions.transition({
                id: restored.id,
                nextStage: "blocked",
                expectedVersion: restored.version,
              });
              return yield* failure({
                code: "execution-failed",
                message: `Plan review could not start: ${causeMessage(cause)}`,
                id: session.id,
                threadId: session.threadId,
              });
            }),
          ),
        );
      yield* orchestration
        .dispatch({
          type: "thread.turn.start",
          commandId: yield* commandId(`review:start:${session.id}`),
          threadId: reviewerThreadId,
          message: {
            messageId: yield* messageId(`review:${session.id}`),
            role: "user",
            text: reviewPrompt,
            attachments: [],
          },
          modelSelection,
          titleSeed: `Review · ${parent.title}`,
          runtimeMode: "approval-required",
          interactionMode: "default",
          createdAt: yield* nowIso(),
        })
        .pipe(
          Effect.catch((cause) =>
            Effect.gen(function* () {
              const { reviewThreadId: _reviewThreadId, ...retryableSession } = session;
              yield* planSessions
                .update({
                  session: {
                    ...retryableSession,
                    lifecycleReason: `Review could not start: ${causeMessage(cause)}`,
                  },
                  expectedVersion: session.version,
                })
                .pipe(
                  Effect.flatMap((updated) =>
                    planSessions.transition({
                      id: updated.id,
                      nextStage: "blocked",
                      expectedVersion: updated.version,
                    }),
                  ),
                  Effect.ignore,
                );
              return yield* failure({
                code: "execution-failed",
                message: `Plan review could not start: ${causeMessage(cause)}`,
                id: session.id,
                threadId: session.threadId,
              });
            }),
          ),
        );
      return { session, reviewerThreadId, started: true };
    }).pipe(
      Effect.catch((cause) =>
        isPlanSessionError(cause)
          ? Effect.fail(cause)
          : Effect.fail(
              failure({ code: "execution-failed", message: causeMessage(cause), id: input.id }),
            ),
      ),
    );

  return { schedule, review } satisfies PlanExecutionCoordinatorShape;
});

export const PlanExecutionCoordinatorLive = Layer.effect(
  PlanExecutionCoordinator,
  makePlanExecutionCoordinator,
);
