import { randomUUID } from "node:crypto";

import type {
  ActionEvidence,
  ActionId,
  ActionParameterValues,
  ActionRunReceipt,
  ActionStepReceipt,
  RuneAction,
} from "@rune/contracts";
import { HostProcessPlatform } from "@rune/shared/hostProcess";
import {
  evaluateActionPreconditions,
  type ActionPreconditionFacts,
} from "@rune/shared/actionPreconditions";
import { prepareActionExecution, type ActionParameterInput } from "@rune/shared/actions";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import * as ProcessRunner from "../processRunner.ts";
import * as ProjectSetupScriptRunner from "./ProjectSetupScriptRunner.ts";

export interface ProjectActionExecutorInput extends Omit<
  ProjectSetupScriptRunner.ProjectSetupScriptRunnerInput,
  "actionId"
> {
  readonly action: RuneAction;
  readonly parameters?: ActionParameterInput;
  /** Explicit acknowledgement permits a declared dirty-worktree precondition. */
  readonly acknowledgeDirtyWorktree?: boolean;
  /** Test/preview seam; production facts are resolved from host services. */
  readonly preconditionFacts?: ActionPreconditionFacts;
}

export interface ProjectActionExecutorResultApprovalRequired {
  readonly status: "approval-required";
  /** Additive for older service implementations; concrete executor results always provide it. */
  readonly runId?: string;
  readonly actionId: ActionId;
  readonly actionVersion: number;
  readonly parameters: ActionParameterValues;
  /** Additive for older service implementations; concrete executor results always provide it. */
  readonly receipt?: ActionRunReceipt;
}

export interface ProjectActionExecutorResultNoScript {
  readonly status: "no-script";
  readonly runId?: string;
  readonly actionId: ActionId;
  readonly actionVersion: number;
  readonly receipt?: ActionRunReceipt;
}

export interface ProjectActionExecutorResultBlocked {
  readonly status: "blocked";
  readonly runId?: string;
  readonly actionId: ActionId;
  readonly actionVersion: number;
  readonly reason: string;
  readonly receipt?: ActionRunReceipt;
}

export interface ProjectActionExecutorResultStarted {
  readonly status: "started";
  readonly runId?: string;
  readonly actionId: ActionId;
  readonly actionVersion: number;
  readonly scriptId: string;
  readonly scriptName: string;
  readonly terminalId: string;
  readonly cwd: string;
  readonly receipt?: ActionRunReceipt;
}

export type ProjectActionExecutorResult =
  | ProjectActionExecutorResultApprovalRequired
  | ProjectActionExecutorResultNoScript
  | ProjectActionExecutorResultBlocked
  | ProjectActionExecutorResultStarted;

export class ProjectActionPreparationError extends Schema.TaggedErrorClass<ProjectActionPreparationError>()(
  "ProjectActionPreparationError",
  {
    actionId: Schema.String,
    code: Schema.Literals([
      "disabled",
      "invalid-parameters",
      "missing-credential",
      "invalid-template",
    ]),
    message: Schema.String,
    parameter: Schema.optional(Schema.String),
  },
) {}

export class ProjectActionUnsupportedError extends Schema.TaggedErrorClass<ProjectActionUnsupportedError>()(
  "ProjectActionUnsupportedError",
  {
    actionId: Schema.String,
    reason: Schema.Literals(["not-project-action", "not-command", "no-steps"]),
    message: Schema.String,
  },
) {}

export type ProjectActionExecutorError =
  | ProjectActionPreparationError
  | ProjectActionUnsupportedError
  | ProjectSetupScriptRunner.ProjectSetupScriptRunnerError;

export class ProjectActionExecutor extends Context.Service<
  ProjectActionExecutor,
  {
    readonly runForThread: (
      input: ProjectActionExecutorInput,
    ) => Effect.Effect<ProjectActionExecutorResult, ProjectActionExecutorError>;
  }
>()("rune/project/ProjectActionExecutor") {}

export const make = Effect.gen(function* () {
  const platform = yield* HostProcessPlatform;
  const setupScriptRunner = yield* ProjectSetupScriptRunner.ProjectSetupScriptRunner;
  const fileSystem = yield* Effect.serviceOption(FileSystem.FileSystem);
  const processRunner = yield* Effect.serviceOption(ProcessRunner.ProcessRunner);

  const makeRunId = () => `action-run:${randomUUID()}`;
  const nowIso = () => DateTime.now.pipe(Effect.map(DateTime.formatIso));
  const makeEvidence = (input: {
    readonly actionId: ActionId;
    readonly runId: string;
    readonly kind: ActionEvidence["kind"];
    readonly summary: string;
    readonly at: string;
  }): ActionEvidence => ({
    id: `${input.runId}:evidence:${randomUUID()}`,
    actionId: input.actionId,
    runId: input.runId,
    kind: input.kind,
    summary: input.summary,
    redacted: true,
    at: input.at,
  });
  const pendingSteps = (
    action: RuneAction,
    evidenceIds: ReadonlyArray<string> = [],
  ): ReadonlyArray<ActionStepReceipt> =>
    action.steps.map((step) => ({
      stepId: step.id,
      status: "pending" as const,
      evidenceIds: [...evidenceIds],
    }));
  const makeReceipt = (input: {
    readonly action: RuneAction;
    readonly runId: string;
    readonly threadId: string;
    readonly parameters: ActionParameterValues;
    readonly status: ActionRunReceipt["status"];
    readonly evidence: ReadonlyArray<ActionEvidence>;
    readonly at: string;
    readonly completedAt?: string;
  }): ActionRunReceipt => ({
    runId: input.runId,
    actionId: input.action.id,
    actionVersion: input.action.version,
    status: input.status,
    threadId: input.threadId,
    parameters: input.parameters,
    modelCalls: 0,
    steps: pendingSteps(
      input.action,
      input.evidence
        .filter((evidence) => evidence.kind === "activity")
        .map((evidence) => evidence.id),
    ),
    evidence: [...input.evidence],
    ...(input.status === "started" ? { startedAt: input.at } : {}),
    ...(input.completedAt === undefined ? {} : { completedAt: input.completedAt }),
  });

  const commandNameForStep = (command: string): string | undefined => {
    const token = command.trim().match(/^(?:"([^"]+)"|'([^']+)'|(\S+))/u);
    return token?.[1] ?? token?.[2] ?? token?.[3];
  };

  const resolvePreconditionFacts = (
    input: ProjectActionExecutorInput,
  ): Effect.Effect<ActionPreconditionFacts> =>
    Effect.gen(function* () {
      if (input.action.preconditions.length === 0) return input.preconditionFacts ?? {};

      const needsRepository = input.action.preconditions.some(
        (precondition) => precondition.kind === "repository-available",
      );
      const needsCleanWorktree = input.action.preconditions.some(
        (precondition) => precondition.kind === "clean-or-acknowledged-worktree",
      );
      const needsToolchain = input.action.preconditions.some(
        (precondition) => precondition.kind === "required-toolchain-available",
      );
      const needsPlatform = input.action.preconditions.some(
        (precondition) => precondition.kind === "compatible-platform",
      );

      const repositoryAvailable = !needsRepository
        ? Effect.succeed(input.preconditionFacts?.repositoryAvailable)
        : Option.match(fileSystem, {
            onNone: () => Effect.succeed(input.preconditionFacts?.repositoryAvailable ?? true),
            onSome: (fs) => fs.exists(input.worktreePath).pipe(Effect.orElseSucceed(() => false)),
          });
      const worktreeClean = !needsCleanWorktree
        ? Effect.succeed(input.preconditionFacts?.worktreeClean)
        : Option.match(processRunner, {
            onNone: () => Effect.succeed(input.preconditionFacts?.worktreeClean),
            onSome: (runner) =>
              runner
                .run({
                  command: "git",
                  args: ["status", "--porcelain", "--untracked-files=no"],
                  cwd: input.worktreePath,
                  timeout: "10 seconds",
                  maxOutputBytes: 128 * 1024,
                  outputMode: "truncate",
                  timeoutBehavior: "timedOutResult",
                })
                .pipe(
                  Effect.map(
                    (result) =>
                      result.code === 0 && !result.timedOut && result.stdout.trim().length === 0,
                  ),
                  Effect.orElseSucceed(() => false),
                ),
          });

      const toolchainCommands = input.action.steps
        .map((step) => commandNameForStep(step.command))
        .filter((command): command is string => command !== undefined);
      const requiredToolchainAvailable = !needsToolchain
        ? Effect.succeed(input.preconditionFacts?.requiredToolchainAvailable)
        : toolchainCommands.length === 0
          ? Effect.succeed(input.preconditionFacts?.requiredToolchainAvailable ?? true)
          : Option.match(processRunner, {
              onNone: () => Effect.succeed(input.preconditionFacts?.requiredToolchainAvailable),
              onSome: (runner) =>
                Effect.forEach(
                  toolchainCommands,
                  (command) =>
                    runner
                      .run({
                        command,
                        args: ["--version"],
                        cwd: input.worktreePath,
                        timeout: "10 seconds",
                        maxOutputBytes: 32 * 1024,
                        outputMode: "truncate",
                        timeoutBehavior: "timedOutResult",
                      })
                      .pipe(
                        Effect.map((result) => result.code === 0 && !result.timedOut),
                        Effect.orElseSucceed(() => false),
                      ),
                  { concurrency: 1 },
                ).pipe(Effect.map((results) => results.every(Boolean))),
            });

      const compatibility = needsPlatform
        ? input.action.compatibility?.osFamily?.toLowerCase()
        : undefined;
      const compatiblePlatform = !needsPlatform
        ? input.preconditionFacts?.compatiblePlatform
        : compatibility === undefined
          ? (input.preconditionFacts?.compatiblePlatform ?? true)
          : compatibility === "windows" || compatibility === "win32"
            ? platform === "win32"
            : compatibility === "macos" || compatibility === "darwin"
              ? platform === "darwin"
              : compatibility === "linux"
                ? platform === "linux"
                : compatibility === "posix" || compatibility === "unix"
                  ? platform !== "win32"
                  : (input.preconditionFacts?.compatiblePlatform ?? false);

      const resolvedRepositoryAvailable = yield* repositoryAvailable;
      const resolvedWorktreeClean = yield* worktreeClean;
      const resolvedToolchainAvailable = yield* requiredToolchainAvailable;
      return {
        ...input.preconditionFacts,
        ...(resolvedRepositoryAvailable === undefined
          ? {}
          : { repositoryAvailable: resolvedRepositoryAvailable }),
        ...(resolvedWorktreeClean === undefined ? {} : { worktreeClean: resolvedWorktreeClean }),
        ...(input.acknowledgeDirtyWorktree === true
          ? { worktreeAcknowledged: true }
          : input.preconditionFacts?.worktreeAcknowledged === undefined
            ? {}
            : { worktreeAcknowledged: input.preconditionFacts.worktreeAcknowledged }),
        ...(resolvedToolchainAvailable === undefined
          ? {}
          : { requiredToolchainAvailable: resolvedToolchainAvailable }),
        ...(compatiblePlatform === undefined ? {} : { compatiblePlatform }),
      } satisfies ActionPreconditionFacts;
    });

  const runForThread: ProjectActionExecutor["Service"]["runForThread"] = Effect.fn(
    "ProjectActionExecutor.runForThread",
  )(function* (input) {
    const { action } = input;
    const runId = makeRunId();
    const at = yield* nowIso();
    if (action.scope !== "project") {
      return yield* new ProjectActionUnsupportedError({
        actionId: action.id,
        reason: "not-project-action",
        message: `Action '${action.id}' is not scoped to a project.`,
      });
    }
    if (action.kind !== "command") {
      return yield* new ProjectActionUnsupportedError({
        actionId: action.id,
        reason: "not-command",
        message: `Project action '${action.id}' is not a command action.`,
      });
    }
    if (action.steps.length === 0) {
      return yield* new ProjectActionUnsupportedError({
        actionId: action.id,
        reason: "no-steps",
        message: `Project action '${action.id}' must contain at least one command step.`,
      });
    }
    const prepared = prepareActionExecution({
      action,
      ...(input.parameters === undefined ? {} : { parameters: input.parameters }),
      platform: platform === "win32" ? "win32" : "posix",
    });
    if (!prepared.ok) {
      return yield* new ProjectActionPreparationError({
        actionId: action.id,
        code: prepared.code,
        message: prepared.message,
        ...(prepared.parameter === undefined ? {} : { parameter: prepared.parameter }),
      });
    }
    const preconditions = yield* resolvePreconditionFacts(input);
    const preconditionEvaluation = evaluateActionPreconditions(action, preconditions);
    if (preconditionEvaluation.blockingFailures.length > 0) {
      const reason = preconditionEvaluation.blockingFailures
        .map((failure) => `${failure.id}: ${failure.reason}`)
        .join(" ");
      const evidence = preconditionEvaluation.results.map((result) =>
        makeEvidence({
          actionId: action.id,
          runId,
          kind: "verification",
          summary: `${result.satisfied ? "Satisfied" : "Blocked"} precondition '${result.id}'.`,
          at,
        }),
      );
      const receipt = makeReceipt({
        action,
        runId,
        threadId: input.threadId,
        parameters: prepared.parameters.redacted,
        status: "blocked",
        evidence,
        at,
        completedAt: at,
      });
      return {
        status: "blocked",
        runId,
        actionId: action.id,
        actionVersion: action.version,
        reason,
        receipt,
      } as const;
    }
    if (prepared.requiresApproval) {
      const evidence = [
        makeEvidence({
          actionId: action.id,
          runId,
          kind: "activity",
          summary: `Approval is required before project action '${action.name}' can run.`,
          at,
        }),
      ];
      const receipt = makeReceipt({
        action,
        runId,
        threadId: input.threadId,
        parameters: prepared.parameters.redacted,
        status: "approval-required",
        evidence,
        at,
      });
      return {
        status: "approval-required",
        runId,
        actionId: action.id,
        actionVersion: action.version,
        parameters: prepared.parameters.redacted,
        receipt,
      } as const;
    }

    // The setup runner owns one terminal stream. Short-circuiting keeps the
    // action deterministic while the receipt truthfully remains pending until
    // terminal output/exit evidence is available to a later lifecycle owner.
    const commandOverride = prepared.steps.map((step) => step.command).join(" && ");
    const setupResult = yield* setupScriptRunner.runForThread({
      threadId: input.threadId,
      ...(input.projectId === undefined ? {} : { projectId: input.projectId }),
      ...(input.projectCwd === undefined ? {} : { projectCwd: input.projectCwd }),
      worktreePath: input.worktreePath,
      ...(input.preferredTerminalId === undefined
        ? {}
        : { preferredTerminalId: input.preferredTerminalId }),
      actionId: action.id,
      actionRunId: runId,
      commandOverride,
    });
    if (setupResult.status === "no-script") {
      const evidence = [
        makeEvidence({
          actionId: action.id,
          runId,
          kind: "activity",
          summary: `Project action '${action.name}' was not queued because no matching project script exists.`,
          at,
        }),
      ];
      const receipt = makeReceipt({
        action,
        runId,
        threadId: input.threadId,
        parameters: prepared.parameters.redacted,
        status: "blocked",
        evidence,
        at,
        completedAt: at,
      });
      return {
        status: "no-script",
        runId,
        actionId: action.id,
        actionVersion: action.version,
        receipt,
      } as const;
    }
    const evidence = [
      makeEvidence({
        actionId: action.id,
        runId,
        kind: "activity",
        summary: `Queued ${prepared.steps.length} project action step${prepared.steps.length === 1 ? "" : "s"} in terminal '${setupResult.terminalId}'.`,
        at,
      }),
    ];
    const receipt = makeReceipt({
      action,
      runId,
      threadId: input.threadId,
      parameters: prepared.parameters.redacted,
      status: "started",
      evidence,
      at,
    });
    return {
      ...setupResult,
      runId,
      actionId: action.id,
      actionVersion: action.version,
      receipt,
    } as const;
  });

  return ProjectActionExecutor.of({ runForThread });
});

export const layer = Layer.effect(ProjectActionExecutor, make);
