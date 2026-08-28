import { it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Queue from "effect/Queue";
import * as Ref from "effect/Ref";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
import { ChildProcessSpawner } from "effect/unstable/process";
import * as NodeAssert from "node:assert/strict";
import { expect } from "vite-plus/test";

import * as NodeServices from "@effect/platform-node/NodeServices";
import * as PlatformError from "effect/PlatformError";
import {
  AntigravitySettings,
  ProviderDriverKind,
  ProviderInstanceId,
  type ProviderRuntimeEvent,
  ThreadId,
} from "@rune/contracts";
import * as Schema from "effect/Schema";

import { makeAntigravityAdapter } from "./AntigravityAdapter.ts";

const decodeSettings = Schema.decodeSync(AntigravitySettings);

it.layer(NodeServices.layer)("AntigravityAdapter", (it) => {
  it.effect("runs a persistent agy stream and maps init, text, and result events", () =>
    Effect.gen(function* () {
      const output = yield* Queue.unbounded<Uint8Array>();
      const killCalls = yield* Ref.make(0);
      const commands: ReadonlyArray<string>[] = [];
      const spawner = ChildProcessSpawner.make((command) => {
        const childCommand = command as unknown as { readonly args: ReadonlyArray<string> };
        commands.push([...childCommand.args]);
        return Effect.succeed(
          ChildProcessSpawner.makeHandle({
            pid: ChildProcessSpawner.ProcessId(1),
            exitCode: Effect.never,
            isRunning: Effect.succeed(true),
            kill: () => Ref.update(killCalls, (calls) => calls + 1),
            unref: Effect.succeed(Effect.void),
            stdin: Sink.drain,
            stdout: Stream.fromQueue(output),
            stderr: Stream.never,
            all: Stream.empty,
            getInputFd: () => Sink.drain,
            getOutputFd: () => Stream.empty,
          }),
        );
      });
      const adapter = yield* makeAntigravityAdapter(decodeSettings({ binaryPath: "agy" }), {
        instanceId: ProviderInstanceId.make("antigravity"),
      }).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner));

      const threadId = ThreadId.make("antigravity-stream-thread");
      const events: ProviderRuntimeEvent[] = [];
      const ready = yield* Deferred.make<void>();
      const turnCompleted = yield* Deferred.make<void>();
      const eventFiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
        Effect.sync(() => events.push(event)).pipe(
          Effect.andThen(
            event.type === "session.state.changed" && event.payload.state === "ready"
              ? Deferred.succeed(ready, undefined)
              : event.type === "turn.completed"
                ? Deferred.succeed(turnCompleted, undefined)
                : Effect.void,
          ),
        ),
      ).pipe(Effect.forkChild);

      yield* adapter.startSession({
        threadId,
        provider: ProviderDriverKind.make("antigravity"),
        cwd: process.cwd(),
        runtimeMode: "full-access",
        modelSelection: {
          instanceId: ProviderInstanceId.make("antigravity"),
          model: "gemini-3.7-flash-high",
          options: [{ id: "effort", value: "high" }],
        },
      });

      const publishLine = (event: Record<string, unknown>) =>
        Queue.offer(output, new TextEncoder().encode(`${JSON.stringify(event)}\n`));

      yield* publishLine({
        event: "init",
        conversation_id: "agy-conversation-1",
        init: { model: "gemini-3.7-flash-high" },
      });
      yield* Deferred.await(ready);

      expect(commands[0]).toEqual([
        "--input-format",
        "stream-json",
        "--output-format",
        "stream-json",
        "--model",
        "gemini-3.7-flash-high",
        "--effort",
        "high",
        "--dangerously-skip-permissions",
      ]);

      const turn = yield* adapter.sendTurn({
        threadId,
        input: "hello Antigravity",
        attachments: [],
        modelSelection: {
          instanceId: ProviderInstanceId.make("antigravity"),
          model: "gemini-3.7-flash-high",
          options: [{ id: "effort", value: "high" }],
        },
      });
      expect(turn.threadId).toBe(threadId);

      yield* publishLine({
        event: "step_update",
        step_update: {
          step_type: "agent_response",
          text_delta: "hello from Antigravity",
        },
      });
      yield* publishLine({
        event: "result",
        result: {
          status: "SUCCESS",
          response: "hello from Antigravity",
          usage: { input_tokens: 3, output_tokens: 4 },
        },
      });
      yield* Deferred.await(turnCompleted);

      const delta = events.find((event) => event.type === "content.delta");
      expect(delta?.type).toBe("content.delta");
      if (delta?.type === "content.delta") {
        expect(delta.payload.delta).toBe("hello from Antigravity");
      }
      const completed = events.find((event) => event.type === "turn.completed");
      expect(completed?.type).toBe("turn.completed");
      if (completed?.type === "turn.completed") {
        expect(completed.payload.state).toBe("completed");
      }

      yield* adapter.stopSession(threadId);
      expect(yield* Ref.get(killCalls)).toBeGreaterThan(0);
      yield* Fiber.interrupt(eventFiber);
    }),
  );

  it.effect("persists the CLI conversation id and resumes it in a replacement process", () =>
    Effect.gen(function* () {
      const outputQueues: Queue.Queue<Uint8Array>[] = [];
      const commands: ReadonlyArray<string>[] = [];
      const spawner = ChildProcessSpawner.make((command) =>
        Effect.gen(function* () {
          const output = yield* Queue.unbounded<Uint8Array>();
          outputQueues.push(output);
          const childCommand = command as unknown as { readonly args: ReadonlyArray<string> };
          commands.push([...childCommand.args]);
          return ChildProcessSpawner.makeHandle({
            pid: ChildProcessSpawner.ProcessId(2 + outputQueues.length),
            exitCode: Effect.never,
            isRunning: Effect.succeed(true),
            kill: () => Effect.void,
            unref: Effect.succeed(Effect.void),
            stdin: Sink.drain,
            stdout: Stream.fromQueue(output),
            stderr: Stream.never,
            all: Stream.empty,
            getInputFd: () => Sink.drain,
            getOutputFd: () => Stream.empty,
          });
        }),
      );
      const adapter = yield* makeAntigravityAdapter(decodeSettings({ binaryPath: "agy" }), {
        instanceId: ProviderInstanceId.make("antigravity"),
      }).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner));
      const threadId = ThreadId.make("antigravity-resume-thread");
      const ready = yield* Deferred.make<void>();
      const replacementReady = yield* Deferred.make<void>();
      let readySignal = ready;
      const eventFiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
        event.type === "session.state.changed" && event.payload.state === "ready"
          ? Deferred.succeed(readySignal, undefined)
          : Effect.void,
      ).pipe(Effect.forkChild);

      yield* adapter.startSession({
        threadId,
        provider: ProviderDriverKind.make("antigravity"),
        cwd: process.cwd(),
        resumeCursor: { schemaVersion: 1, conversationId: "agy-conversation-previous" },
        runtimeMode: "full-access",
      });
      yield* Queue.offer(
        outputQueues[0]!,
        new TextEncoder().encode(
          '{"event":"init","conversation_id":"agy-conversation-previous","model":"gemini-3.7-flash-high"}\n',
        ),
      );
      yield* Deferred.await(ready);

      expect(commands[0]).toContain("--conversation");
      expect(commands[0]).toContain("agy-conversation-previous");
      const session = (yield* adapter.listSessions())[0];
      expect(session?.resumeCursor).toEqual({
        schemaVersion: 1,
        conversationId: "agy-conversation-previous",
      });

      const turn = yield* adapter.sendTurn({
        threadId,
        input: "continue after the restart",
        attachments: [],
      });
      expect(turn.resumeCursor).toEqual(session?.resumeCursor);

      yield* adapter.stopSession(threadId);
      readySignal = replacementReady;
      yield* adapter.startSession({
        threadId,
        provider: ProviderDriverKind.make("antigravity"),
        cwd: process.cwd(),
        resumeCursor: turn.resumeCursor,
        runtimeMode: "full-access",
      });
      yield* Queue.offer(
        outputQueues[1]!,
        new TextEncoder().encode(
          '{"event":"init","conversation_id":"agy-conversation-previous","model":"gemini-3.7-flash-high"}\n',
        ),
      );
      yield* Deferred.await(replacementReady);
      expect(commands[1]).toContain("--conversation");
      expect(commands[1]).toContain("agy-conversation-previous");
      yield* adapter.stopSession(threadId);
      yield* Fiber.interrupt(eventFiber);
    }),
  );

  it.effect("ignores stale output from a replaced session generation", () =>
    Effect.gen(function* () {
      const outputQueues: Queue.Queue<Uint8Array>[] = [];
      const spawner = ChildProcessSpawner.make(() =>
        Effect.gen(function* () {
          const output = yield* Queue.unbounded<Uint8Array>();
          outputQueues.push(output);
          return ChildProcessSpawner.makeHandle({
            pid: ChildProcessSpawner.ProcessId(10 + outputQueues.length),
            exitCode: Effect.never,
            isRunning: Effect.succeed(true),
            kill: () => Effect.void,
            unref: Effect.succeed(Effect.void),
            stdin: Sink.drain,
            stdout: Stream.fromQueue(output),
            stderr: Stream.never,
            all: Stream.empty,
            getInputFd: () => Sink.drain,
            getOutputFd: () => Stream.empty,
          });
        }),
      );
      const adapter = yield* makeAntigravityAdapter(decodeSettings({ binaryPath: "agy" }), {
        instanceId: ProviderInstanceId.make("antigravity"),
      }).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner));
      const threadId = ThreadId.make("antigravity-stale-generation");
      const events: ProviderRuntimeEvent[] = [];
      const replacementReady = yield* Deferred.make<void>();
      const eventFiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
        Effect.sync(() => events.push(event)).pipe(
          Effect.andThen(
            event.type === "thread.started" &&
              event.payload.providerThreadId === "fresh-conversation"
              ? Deferred.succeed(replacementReady, undefined)
              : Effect.void,
          ),
        ),
      ).pipe(Effect.forkChild);

      yield* adapter.startSession({
        threadId,
        provider: ProviderDriverKind.make("antigravity"),
        cwd: process.cwd(),
        runtimeMode: "full-access",
      });
      yield* adapter.startSession({
        threadId,
        provider: ProviderDriverKind.make("antigravity"),
        cwd: process.cwd(),
        resumeCursor: { schemaVersion: 1, conversationId: "fresh-conversation" },
        runtimeMode: "full-access",
      });

      yield* Queue.offer(
        outputQueues[0]!,
        new TextEncoder().encode(
          '{"event":"init","conversation_id":"stale-conversation","model":"stale-model"}\n',
        ),
      );
      yield* Effect.yieldNow;
      NodeAssert.equal(
        events.some(
          (event) =>
            event.type === "thread.started" &&
            event.payload.providerThreadId === "stale-conversation",
        ),
        false,
      );

      yield* Queue.offer(
        outputQueues[1]!,
        new TextEncoder().encode(
          '{"event":"init","conversation_id":"fresh-conversation","model":"fresh-model"}\n',
        ),
      );
      yield* Deferred.await(replacementReady);
      const current = (yield* adapter.listSessions())[0];
      NodeAssert.equal(current?.resumeCursor?.conversationId, "fresh-conversation");
      NodeAssert.equal(
        events.filter((event) => event.type === "thread.started").length,
        1,
      );

      yield* adapter.stopSession(threadId);
      yield* Fiber.interrupt(eventFiber);
    }),
  );

  it.effect("projects readiness timeout as a recoverable staged diagnostic", () =>
    Effect.gen(function* () {
      const spawner = ChildProcessSpawner.make(() =>
        Effect.succeed(
          ChildProcessSpawner.makeHandle({
            pid: ChildProcessSpawner.ProcessId(20),
            exitCode: Effect.never,
            isRunning: Effect.succeed(true),
            kill: () => Effect.void,
            unref: Effect.succeed(Effect.void),
            stdin: Sink.drain,
            stdout: Stream.never,
            stderr: Stream.never,
            all: Stream.empty,
            getInputFd: () => Sink.drain,
            getOutputFd: () => Stream.empty,
          }),
        ),
      );
      const adapter = yield* makeAntigravityAdapter(decodeSettings({ binaryPath: "agy" }), {
        instanceId: ProviderInstanceId.make("antigravity"),
        sessionReadyTimeoutMs: 10,
      }).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner));
      const threadId = ThreadId.make("antigravity-readiness-timeout");
      const events: ProviderRuntimeEvent[] = [];
      const exited = yield* Deferred.make<void>();
      const eventFiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
        Effect.sync(() => events.push(event)).pipe(
          Effect.andThen(
            event.type === "session.exited"
              ? Deferred.succeed(exited, undefined)
              : Effect.void,
          ),
        ),
      ).pipe(Effect.forkChild);

      yield* adapter.startSession({
        threadId,
        provider: ProviderDriverKind.make("antigravity"),
        cwd: process.cwd(),
        runtimeMode: "full-access",
      });
      const result = yield* adapter
        .sendTurn({ threadId, input: "hello", attachments: [] })
        .pipe(Effect.result);
      NodeAssert.equal(result._tag, "Failure");
      if (result._tag === "Failure") {
        NodeAssert.equal(result.failure._tag, "ProviderAdapterProcessError");
        if (result.failure._tag === "ProviderAdapterProcessError") {
          NodeAssert.equal(result.failure.stage, "process-initialization");
          NodeAssert.equal(result.failure.providerInstanceId, "antigravity");
          NodeAssert.equal(result.failure.generation, 1);
          NodeAssert.equal(result.failure.recoverable, true);
          NodeAssert.equal(result.failure.safeMessage, result.failure.detail);
          NodeAssert.match(result.failure.detail, /did not initialize within 0\.01 seconds/);
          NodeAssert.equal(typeof result.failure.occurredAt, "string");
          NodeAssert.ok(Number.isFinite(Date.parse(result.failure.occurredAt ?? "")));
        }
      }

      yield* Deferred.await(exited);
      const stateChanged = events.find(
        (event) => event.type === "session.state.changed" && event.payload.state === "error",
      );
      NodeAssert.equal(stateChanged?.type, "session.state.changed");
      if (stateChanged?.type === "session.state.changed") {
        NodeAssert.match(stateChanged.payload.reason ?? "", /did not initialize/);
        const diagnostic = stateChanged.payload.detail as
          | { readonly stage?: unknown; readonly recoverable?: unknown; readonly generation?: unknown }
          | undefined;
        NodeAssert.equal(diagnostic?.stage, "process-initialization");
        NodeAssert.equal(diagnostic?.recoverable, true);
        NodeAssert.equal(diagnostic?.generation, 1);
      }
      const sessionExited = events.find((event) => event.type === "session.exited");
      NodeAssert.equal(sessionExited?.type, "session.exited");
      if (sessionExited?.type === "session.exited") {
        NodeAssert.equal(sessionExited.payload.exitKind, "error");
        NodeAssert.equal(sessionExited.payload.recoverable, true);
        NodeAssert.match(sessionExited.payload.reason ?? "", /did not initialize/);
      }

      yield* Fiber.interrupt(eventFiber);
    }),
  );

  it.effect("classifies recoverable authentication and model stream failures", () =>
    Effect.gen(function* () {
      const output = yield* Queue.unbounded<Uint8Array>();
      const spawner = ChildProcessSpawner.make(() =>
        Effect.succeed(
          ChildProcessSpawner.makeHandle({
            pid: ChildProcessSpawner.ProcessId(30),
            exitCode: Effect.never,
            isRunning: Effect.succeed(true),
            kill: () => Effect.void,
            unref: Effect.succeed(Effect.void),
            stdin: Sink.drain,
            stdout: Stream.fromQueue(output),
            stderr: Stream.never,
            all: Stream.empty,
            getInputFd: () => Sink.drain,
            getOutputFd: () => Stream.empty,
          }),
        ),
      );
      const adapter = yield* makeAntigravityAdapter(decodeSettings({ binaryPath: "agy" }), {
        instanceId: ProviderInstanceId.make("antigravity"),
      }).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner));
      const threadId = ThreadId.make("antigravity-stream-failures");
      const eventQueue = yield* Queue.unbounded<ProviderRuntimeEvent>();
      const ready = yield* Deferred.make<void>();
      const eventFiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
        Queue.offer(eventQueue, event).pipe(
          Effect.andThen(
            event.type === "session.state.changed" && event.payload.state === "ready"
              ? Deferred.succeed(ready, undefined)
              : Effect.void,
          ),
        ),
      ).pipe(Effect.forkChild);
      const awaitRuntimeError = (turnId: TurnId) =>
        Effect.gen(function* () {
          while (true) {
            const event = yield* Queue.take(eventQueue);
            if (event.type === "runtime.error" && event.turnId === turnId) return event;
          }
        });

      yield* adapter.startSession({
        threadId,
        provider: ProviderDriverKind.make("antigravity"),
        cwd: process.cwd(),
        runtimeMode: "full-access",
      });
      yield* Queue.offer(
        output,
        new TextEncoder().encode(
          '{"event":"init","conversation_id":"failure-conversation","model":"gemini-3.7-flash-high"}\n',
        ),
      );
      yield* Deferred.await(ready);

      const authTurn = yield* adapter.sendTurn({ threadId, input: "auth", attachments: [] });
      yield* Queue.offer(
        output,
        new TextEncoder().encode(
          '{"event":"result","result":{"status":"ERROR","error":"authentication required for this account"}}\n',
        ),
      );
      const authError = yield* awaitRuntimeError(authTurn.turnId);
      NodeAssert.equal(authError.payload.message, "authentication required for this account");
      const authDetail = authError.payload.detail as
        | { readonly stage?: unknown; readonly recoverable?: unknown; readonly generation?: unknown; readonly safeMessage?: unknown; readonly providerInstanceId?: unknown }
        | undefined;
      NodeAssert.equal(authDetail?.stage, "authentication");
      NodeAssert.equal(authDetail?.recoverable, true);
      NodeAssert.equal(authDetail?.generation, 1);
      NodeAssert.equal(authDetail?.providerInstanceId, "antigravity");
      NodeAssert.equal(authDetail?.safeMessage, "authentication required for this account");

      const modelTurn = yield* adapter.sendTurn({ threadId, input: "model", attachments: [] });
      yield* Queue.offer(
        output,
        new TextEncoder().encode(
          '{"event":"result","result":{"status":"ERROR","error":"model gemini-missing is not found"}}\n',
        ),
      );
      const modelError = yield* awaitRuntimeError(modelTurn.turnId);
      const modelDetail = modelError.payload.detail as
        | { readonly stage?: unknown; readonly recoverable?: unknown; readonly safeMessage?: unknown }
        | undefined;
      NodeAssert.equal(modelDetail?.stage, "model-discovery");
      NodeAssert.equal(modelDetail?.recoverable, true);
      NodeAssert.equal(modelDetail?.safeMessage, "model gemini-missing is not found");

      yield* adapter.stopSession(threadId);
      yield* Fiber.interrupt(eventFiber);
    }),
  );

  it.effect("preserves a pre-init process failure and distinguishes unknown threads", () =>
    Effect.gen(function* () {
      const output = yield* Queue.unbounded<Uint8Array>();
      const stderr = yield* Queue.unbounded<Uint8Array>();
      const exitCode = yield* Deferred.make<ChildProcessSpawner.ExitCode>();
      const spawner = ChildProcessSpawner.make(() =>
        Effect.succeed(
          ChildProcessSpawner.makeHandle({
            pid: ChildProcessSpawner.ProcessId(3),
            exitCode: Deferred.await(exitCode),
            isRunning: Effect.succeed(true),
            kill: () => Effect.void,
            unref: Effect.succeed(Effect.void),
            stdin: Sink.drain,
            stdout: Stream.fromQueue(output),
            stderr: Stream.fromQueue(stderr),
            all: Stream.empty,
            getInputFd: () => Sink.drain,
            getOutputFd: () => Stream.empty,
          }),
        ),
      );
      const adapter = yield* makeAntigravityAdapter(decodeSettings({ binaryPath: "agy" }), {
        instanceId: ProviderInstanceId.make("antigravity"),
      }).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner));

      const threadId = ThreadId.make("antigravity-startup-failure");
      const events: ProviderRuntimeEvent[] = [];
      const exited = yield* Deferred.make<void>();
      const eventFiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
        Effect.sync(() => events.push(event)).pipe(
          Effect.andThen(
            event.type === "session.exited" ? Deferred.succeed(exited, undefined) : Effect.void,
          ),
        ),
      ).pipe(Effect.forkChild);

      const session = yield* adapter.startSession({
        threadId,
        provider: ProviderDriverKind.make("antigravity"),
        cwd: process.cwd(),
        runtimeMode: "full-access",
      });
      expect(session.status).toBe("connecting");

      yield* Queue.offer(
        stderr,
        new TextEncoder().encode("authentication token: secret-value\naccount is not signed in\n"),
      );
      yield* Effect.yieldNow;
      const pendingSend = yield* adapter
        .sendTurn({ threadId, input: "hello", attachments: [] })
        .pipe(Effect.result, Effect.forkChild);
      yield* Deferred.succeed(exitCode, ChildProcessSpawner.ExitCode(1));
      yield* Deferred.await(exited);

      const failedSend = yield* Fiber.join(pendingSend);
      NodeAssert.equal(failedSend._tag, "Failure");
      if (failedSend._tag === "Failure") {
        NodeAssert.equal(failedSend.failure._tag, "ProviderAdapterProcessError");
        if (failedSend.failure._tag === "ProviderAdapterProcessError") {
          NodeAssert.match(failedSend.failure.detail, /account is not signed in/);
          NodeAssert.match(failedSend.failure.detail, /token: \[redacted\]/);
          NodeAssert.doesNotMatch(failedSend.failure.detail, /secret-value/);
          NodeAssert.equal(failedSend.failure.stage, "authentication");
          NodeAssert.equal(failedSend.failure.providerInstanceId, "antigravity");
          NodeAssert.equal(failedSend.failure.generation, 1);
          NodeAssert.equal(failedSend.failure.recoverable, true);
          NodeAssert.match(failedSend.failure.stderrTail ?? "", /account is not signed in/);
        }
      }

      const stateChanged = events.find(
        (event) => event.type === "session.state.changed" && event.payload.state === "error",
      );
      NodeAssert.equal(stateChanged?.type, "session.state.changed");
      if (stateChanged?.type === "session.state.changed") {
        NodeAssert.match(stateChanged.payload.reason ?? "", /account is not signed in/);
      }
      const sessionExited = events.find((event) => event.type === "session.exited");
      NodeAssert.equal(sessionExited?.type, "session.exited");
      if (sessionExited?.type === "session.exited") {
        NodeAssert.match(sessionExited.payload.reason ?? "", /account is not signed in/);
      }

      const unknownThread = yield* adapter
        .sendTurn({
          threadId: ThreadId.make("antigravity-never-started"),
          input: "hello",
          attachments: [],
        })
        .pipe(Effect.result);
      NodeAssert.equal(unknownThread._tag, "Failure");
      if (unknownThread._tag === "Failure") {
        NodeAssert.equal(unknownThread.failure._tag, "ProviderAdapterSessionNotFoundError");
        NodeAssert.match(unknownThread.failure.message, /Unknown antigravity adapter thread/);
      }

      yield* Fiber.interrupt(eventFiber);
    }),
  );

  it.effect("retains a spawn failure for the next turn instead of reporting an unknown thread", () =>
    Effect.gen(function* () {
      const spawner = ChildProcessSpawner.make(() =>
        Effect.fail(
          PlatformError.systemError({
            _tag: "PermissionDenied",
            module: "ChildProcess",
            method: "spawn",
            description: "spawn denied by test host",
          }),
        ),
      );
      const adapter = yield* makeAntigravityAdapter(decodeSettings({ binaryPath: "agy" }), {
        instanceId: ProviderInstanceId.make("antigravity"),
      }).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner));
      const threadId = ThreadId.make("antigravity-spawn-failure");
      const start = yield* adapter
        .startSession({
          threadId,
          provider: ProviderDriverKind.make("antigravity"),
          cwd: process.cwd(),
          runtimeMode: "full-access",
        })
        .pipe(Effect.result);
      NodeAssert.equal(start._tag, "Failure");
      if (start._tag === "Failure") {
        NodeAssert.equal(start.failure._tag, "ProviderAdapterProcessError");
        if (start.failure._tag === "ProviderAdapterProcessError") {
          NodeAssert.equal(start.failure.stage, "process-spawn");
          NodeAssert.match(start.failure.cause?.toString() ?? "", /spawn denied/);
        }
      }

      const send = yield* adapter
        .sendTurn({ threadId, input: "hello", attachments: [] })
        .pipe(Effect.result);
      NodeAssert.equal(send._tag, "Failure");
      if (send._tag === "Failure") {
        NodeAssert.equal(send.failure._tag, "ProviderAdapterProcessError");
        if (send.failure._tag === "ProviderAdapterProcessError") {
          NodeAssert.equal(send.failure.stage, "process-spawn");
          NodeAssert.match(send.failure.detail, /Failed to start Antigravity CLI/);
        }
      }
    }),
  );
});
