import { describe, expect, it } from "@effect/vitest";
import { ActionRunReceipt } from "@rune/contracts";
import { projectScriptToAction } from "@rune/shared/actions";
import { HostProcessPlatform } from "@rune/shared/hostProcess";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import * as ProjectActionExecutor from "./ProjectActionExecutor.ts";
import * as ProjectSetupScriptRunner from "./ProjectSetupScriptRunner.ts";

const receiptOf = (result: ProjectActionExecutor.ProjectActionExecutorResult) => {
  if (result.receipt === undefined) throw new Error("executor did not return a receipt");
  return result.receipt;
};

const projectScript = {
  id: "test",
  name: "Test",
  command: "pnpm test",
  icon: "test" as const,
  runOnWorktreeCreate: false,
};

const action = projectScriptToAction(projectScript, {
  now: "2026-01-01T00:00:00.000Z",
});

const makeLayer = (
  runForThread: ProjectSetupScriptRunner.ProjectSetupScriptRunner["Service"]["runForThread"],
) =>
  ProjectActionExecutor.layer.pipe(
    Layer.provide(
      Layer.succeed(ProjectSetupScriptRunner.ProjectSetupScriptRunner, { runForThread }),
    ),
    Layer.provide(Layer.succeed(HostProcessPlatform, "linux")),
  );

const runInput = {
  threadId: "thread-1",
  projectId: "project-1",
  worktreePath: "/repo/worktree",
  action,
};

describe("ProjectActionExecutor", () => {
  it.effect("delegates a project script action to the setup runner", () => {
    const calls: ProjectSetupScriptRunner.ProjectSetupScriptRunnerInput[] = [];
    const runForThread = (input: ProjectSetupScriptRunner.ProjectSetupScriptRunnerInput) =>
      Effect.sync(() => {
        calls.push(input);
        return {
          status: "started" as const,
          scriptId: "test",
          scriptName: "Test",
          terminalId: "script-test",
          cwd: "/repo/worktree",
        };
      });

    return Effect.gen(function* () {
      const executor = yield* ProjectActionExecutor.ProjectActionExecutor;
      const result = yield* executor.runForThread(runInput);

      expect(result.status).toBe("started");
      expect(result.runId).toMatch(/^action-run:[0-9a-f-]{36}$/u);
      const receipt = receiptOf(result);
      expect(receipt.runId).toBe(result.runId);
      expect(Schema.is(ActionRunReceipt)(receipt)).toBe(true);
      expect(receipt).toMatchObject({
        actionId: action.id,
        actionVersion: 1,
        status: "started",
        threadId: "thread-1",
        parameters: {},
        modelCalls: 0,
        steps: [{ stepId: "run", status: "pending", evidenceIds: expect.any(Array) }],
      });
      expect(receipt.completedAt).toBeUndefined();
      expect(calls).toEqual([
        {
          threadId: "thread-1",
          projectId: "project-1",
          worktreePath: "/repo/worktree",
          actionId: action.id,
          actionRunId: result.runId,
          commandOverride: "pnpm test",
        },
      ]);
    }).pipe(Effect.provide(makeLayer(runForThread)));
  });

  it.effect("returns no-script when the project action is not in the project", () =>
    Effect.gen(function* () {
      const executor = yield* ProjectActionExecutor.ProjectActionExecutor;
      const result = yield* executor.runForThread(runInput);

      expect(result.status).toBe("no-script");
      expect(result.runId).toMatch(/^action-run:[0-9a-f-]{36}$/u);
      const receipt = receiptOf(result);
      expect(receipt.runId).toBe(result.runId);
      expect(receipt.status).toBe("blocked");
      expect(receipt.completedAt).toBeDefined();
      expect(receipt.evidence).toHaveLength(1);
      expect(receipt.evidence[0]?.summary).toContain("was not queued");
      expect(result.recovery?.strategy).toBe("agent");
      expect(result.recovery?.reason).toContain("project script is missing");
      expect(result.recovery?.reason).toContain("Agent fallback is available");
    }).pipe(Effect.provide(makeLayer(() => Effect.succeed({ status: "no-script" as const })))),
  );

  it.effect("blocks a drifted compatibility fingerprint with its configured recovery", () => {
    const runForThread = () => Effect.die("drifted actions must not be queued");
    const driftedAction = {
      ...action,
      fallbackPolicy: "assisted-repair" as const,
      compatibility: { osFamily: "windows" },
    };

    return Effect.gen(function* () {
      const executor = yield* ProjectActionExecutor.ProjectActionExecutor;
      const result = yield* executor.runForThread({ ...runInput, action: driftedAction });

      expect(result.status).toBe("blocked");
      expect(result.recovery?.strategy).toBe("assisted-repair");
      expect(result.recovery?.reason).toContain("Action drift detected");
      expect(result.recovery?.reason).toContain("Operating system changed");
    }).pipe(Effect.provide(makeLayer(runForThread)));
  });

  it.effect("fails closed when a declared fingerprint cannot be observed", () => {
    const runForThread = () => Effect.die("unverified actions must not be queued");
    const unverifiedAction = {
      ...action,
      fallbackPolicy: "none" as const,
      compatibility: { toolVersions: { node: "24" } },
    };

    return Effect.gen(function* () {
      const executor = yield* ProjectActionExecutor.ProjectActionExecutor;
      const result = yield* executor.runForThread({ ...runInput, action: unverifiedAction });

      expect(result.status).toBe("blocked");
      expect(result.recovery?.strategy).toBe("none");
      expect(result.recovery?.reason).toContain("compatibility is unverified");
      expect(result.recovery?.reason).toContain("Tool version fingerprint could not be verified");
    }).pipe(Effect.provide(makeLayer(runForThread)));
  });

  it.effect("does not execute a disabled action", () => {
    const runForThread = () => Effect.die("setup runner must not be called");
    const disabledAction = { ...action, enabled: false };

    return Effect.gen(function* () {
      const executor = yield* ProjectActionExecutor.ProjectActionExecutor;
      const error = yield* executor
        .runForThread({ ...runInput, action: disabledAction })
        .pipe(Effect.flip);

      expect(error._tag).toBe("ProjectActionPreparationError");
      if (error._tag === "ProjectActionPreparationError") {
        expect(error.code).toBe("disabled");
      }
    }).pipe(Effect.provide(makeLayer(runForThread)));
  });

  it.effect("returns approval-required without starting a dangerous script", () => {
    const runForThread = () => Effect.die("setup runner must not be called");
    const dangerousAction = {
      ...action,
      capabilities: ["git-push" as const],
    };

    return Effect.gen(function* () {
      const executor = yield* ProjectActionExecutor.ProjectActionExecutor;
      const result = yield* executor.runForThread({ ...runInput, action: dangerousAction });

      expect(result.status).toBe("approval-required");
      expect(result.runId).toMatch(/^action-run:[0-9a-f-]{36}$/u);
      const receipt = receiptOf(result);
      expect(receipt.runId).toBe(result.runId);
      expect(receipt.status).toBe("approval-required");
      expect(receipt.recovery).toBeUndefined();
      expect(receipt.steps).toEqual([
        { stepId: "run", status: "pending", evidenceIds: expect.any(Array) },
      ]);
      expect(receipt.evidence[0]?.redacted).toBe(true);
    }).pipe(Effect.provide(makeLayer(runForThread)));
  });

  it.effect("queues every validated step in order without claiming completion", () => {
    const calls: ProjectSetupScriptRunner.ProjectSetupScriptRunnerInput[] = [];
    const runForThread = (input: ProjectSetupScriptRunner.ProjectSetupScriptRunnerInput) =>
      Effect.sync(() => {
        calls.push(input);
        return {
          status: "started" as const,
          scriptId: "release",
          scriptName: "Release",
          terminalId: "script-release",
          cwd: "/repo/worktree",
        };
      });
    const multiStepAction = {
      ...action,
      name: "Release",
      steps: [
        { id: "build", name: "Build", kind: "run-command" as const, command: "pnpm build" },
        { id: "verify", name: "Verify", kind: "run-command" as const, command: "pnpm verify" },
      ],
    };

    return Effect.gen(function* () {
      const executor = yield* ProjectActionExecutor.ProjectActionExecutor;
      const result = yield* executor.runForThread({ ...runInput, action: multiStepAction });

      expect(result.status).toBe("started");
      expect(calls[0]?.commandOverride).toBe("pnpm build && pnpm verify");
      const receipt = receiptOf(result);
      expect(receipt.steps.map((step) => [step.stepId, step.status])).toEqual([
        ["build", "pending"],
        ["verify", "pending"],
      ]);
      expect(receipt.status).toBe("started");
      expect(receipt.completedAt).toBeUndefined();
      expect(receipt.evidence[0]?.summary).toContain("Queued 2 project action steps");
    }).pipe(Effect.provide(makeLayer(runForThread)));
  });

  it.effect("requires approval when any multi-step action step is dangerous", () => {
    let calls = 0;
    const runForThread = () =>
      Effect.sync(() => {
        calls += 1;
        return {
          status: "started" as const,
          scriptId: "release",
          scriptName: "Release",
          terminalId: "script-release",
          cwd: "/repo/worktree",
        };
      });
    const dangerousMultiStepAction = {
      ...action,
      steps: [
        { id: "build", name: "Build", kind: "run-command" as const, command: "pnpm build" },
        {
          id: "publish",
          name: "Publish",
          kind: "run-command" as const,
          command: "pnpm publish",
          capabilities: ["git-push" as const],
        },
      ],
    };

    return Effect.gen(function* () {
      const executor = yield* ProjectActionExecutor.ProjectActionExecutor;
      const result = yield* executor.runForThread({
        ...runInput,
        action: dangerousMultiStepAction,
      });

      expect(result.status).toBe("approval-required");
      const receipt = receiptOf(result);
      expect(receipt.status).toBe("approval-required");
      expect(receipt.steps).toHaveLength(2);
      expect(calls).toBe(0);
    }).pipe(Effect.provide(makeLayer(runForThread)));
  });
});
