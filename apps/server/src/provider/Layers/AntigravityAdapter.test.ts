import { it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Queue from "effect/Queue";
import * as Ref from "effect/Ref";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
import { ChildProcessSpawner } from "effect/unstable/process";
import { expect } from "vite-plus/test";

import * as NodeServices from "@effect/platform-node/NodeServices";
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
        model: "gemini-3.7-flash-high",
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
        step_type: "agent_response",
        text_delta: "hello from Antigravity",
      });
      yield* publishLine({
        event: "result",
        status: "SUCCESS",
        response: "hello from Antigravity",
        usage: { input_tokens: 3, output_tokens: 4 },
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
      const output = yield* Queue.unbounded<Uint8Array>();
      const commands: ReadonlyArray<string>[] = [];
      const spawner = ChildProcessSpawner.make((command) => {
        const childCommand = command as unknown as { readonly args: ReadonlyArray<string> };
        commands.push([...childCommand.args]);
        return Effect.succeed(
          ChildProcessSpawner.makeHandle({
            pid: ChildProcessSpawner.ProcessId(2),
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
        );
      });
      const adapter = yield* makeAntigravityAdapter(decodeSettings({ binaryPath: "agy" }), {
        instanceId: ProviderInstanceId.make("antigravity"),
      }).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner));
      const threadId = ThreadId.make("antigravity-resume-thread");
      const ready = yield* Deferred.make<void>();
      const eventFiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
        event.type === "session.state.changed" && event.payload.state === "ready"
          ? Deferred.succeed(ready, undefined)
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
        output,
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
      yield* Fiber.interrupt(eventFiber);
    }),
  );
});
