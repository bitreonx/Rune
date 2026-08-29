import { describe, expect, it } from "@effect/vitest";
import { ProviderDriverKind, ProviderInstanceId } from "@rune/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";
import { HttpClient } from "effect/unstable/http";

import * as NetService from "@rune/shared/Net";
import {
  makeModelBridgeSupervisor,
  type ModelBridgeProcessFactory,
} from "./ModelBridgeSupervisor.ts";

const route = {
  harness: ProviderDriverKind.make("claudeAgent"),
  instanceId: ProviderInstanceId.make("claude-codex-bridge"),
  requestedModel: "gpt-5.6",
  routeKind: "rune-bridge",
  protocolFamily: "openai-responses",
  bridgeRequired: true,
  subagentModelPolicy: "inherit",
  capabilities: {
    streaming: true,
    tools: true,
    images: false,
    usage: true,
    reasoningEffort: false,
  },
} as const;

const processFactory = (state: { starts: number; stops: number }): ModelBridgeProcessFactory => ({
  start: (input) =>
    Effect.succeed({
      stop: Effect.sync(() => {
        state.stops += 1;
      }),
      isRunning: Effect.succeed(true),
    }).pipe(
      Effect.tap(() =>
        Effect.sync(() => {
          state.starts += 1;
          expect(input.args).toContain("--host");
          expect(input.args).toContain("127.0.0.1");
          expect(input.environment.RUNE_MODEL_BRIDGE_CONFIG_DIR).toBe(input.cwd);
        }),
      ),
    ),
});

const TestLayer = Layer.mergeAll(
  Layer.succeed(
    FileSystem.FileSystem,
    FileSystem.makeNoop({
      makeDirectory: (path) => Effect.void,
      remove: (path) => Effect.void,
      exists: (path) => Effect.succeed(path === "C:/rune-bridge-test/bridge-instance"),
    }),
  ),
  Layer.succeed(NetService.NetService, NetService.make()),
  Layer.succeed(
    ChildProcessSpawner.ChildProcessSpawner,
    ChildProcessSpawner.make(() => Effect.die("unused in supervisor tests")),
  ),
  Layer.succeed(HttpClient.HttpClient, HttpClient.make(() => Effect.die("unused in supervisor tests"))),
);

describe("ModelBridgeSupervisor", () => {
  it.effect("starts lazily, validates health, and cleans up an unused instance", () =>
    Effect.gen(function* () {
      const state = { starts: 0, stops: 0 };
      const supervisor = yield* makeModelBridgeSupervisor({
        executable: "rune-bridge-test",
        baseDir: "C:/rune-bridge-test",
        processFactory: processFactory(state),
        reservePort: () => Effect.succeed(43123),
        healthProbe: {
          check: () =>
            Effect.succeed({
              status: "ready",
              capabilities: {
                streaming: true,
                tools: true,
                usage: true,
                images: false,
                reasoningEffort: false,
                protocols: ["openai-responses"],
              },
            }),
        },
      });

      const statusBefore = yield* supervisor.getStatus(route.instanceId);
      expect(statusBefore.status).toBe("stopped");
      expect(state.starts).toBe(0);

      const lease = yield* supervisor.ensureStarted({ route });
      expect(lease.endpoint).toBe("http://127.0.0.1:43123/");
      expect(state.starts).toBe(1);
      expect((yield* supervisor.getStatus(route.instanceId)).status).toBe("ready");

      const secondLease = yield* supervisor.ensureStarted({ route });
      expect(secondLease.endpoint).toBe(lease.endpoint);
      expect(state.starts).toBe(1);

      yield* supervisor.release(route.instanceId);
      expect(state.stops).toBe(0);
      yield* supervisor.release(route.instanceId);
      expect(state.stops).toBe(1);
      expect((yield* supervisor.getStatus(route.instanceId)).status).toBe("stopped");
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.effect("fails closed when no validated bridge executable is available", () =>
    Effect.gen(function* () {
      const supervisor = yield* makeModelBridgeSupervisor({
        reservePort: () => Effect.succeed(43124),
        processFactory: processFactory({ starts: 0, stops: 0 }),
      });
      const result = yield* supervisor.ensureStarted({ route }).pipe(Effect.result);
      expect(result._tag).toBe("Failure");
      expect((yield* supervisor.getStatus(route.instanceId)).status).toBe("disabled");
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.effect("does not expose bridge credentials or process output in status", () =>
    Effect.gen(function* () {
      const supervisor = yield* makeModelBridgeSupervisor({
        executable: "bridge",
        processFactory: processFactory({ starts: 0, stops: 0 }),
        reservePort: () => Effect.succeed(43125),
        healthProbe: {
          check: () =>
            Effect.succeed({
              status: "ready",
              token: "must-not-escape",
              capabilities: {
                streaming: true,
                tools: true,
                usage: true,
                images: false,
                reasoningEffort: false,
                protocols: ["openai-responses"],
              },
            }),
        },
      });
      const lease = yield* supervisor.ensureStarted({ route });
      const status = yield* supervisor.getStatus(route.instanceId);
      expect(status).not.toHaveProperty("token");
      expect(lease.health).not.toHaveProperty("token");
      yield* supervisor.stopAll;
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );
});
