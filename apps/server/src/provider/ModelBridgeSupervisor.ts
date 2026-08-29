// @effect-diagnostics nodeBuiltinImport:off
/**
 * Lifecycle boundary for an optional RUNE-managed model translator.
 *
 * The default live layer has no executable configured. That is intentional:
 * until a translator is bundled, licensed, packaged, and capability-tested,
 * cross-family routes remain unavailable instead of launching a native CLI
 * against the wrong protocol. Tests and a future bundled sidecar can provide
 * a process factory through `makeModelBridgeSupervisor`.
 */
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import type { HarnessModelRoutePlan, ProviderInstanceId } from "@rune/contracts";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Ref from "effect/Ref";
import * as Scope from "effect/Scope";
import * as ChildProcess from "effect/unstable/process/ChildProcess";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";

import * as NetService from "@rune/shared/Net";
import { HostProcessPlatform } from "@rune/shared/hostProcess";
import { resolveSpawnCommand } from "@rune/shared/shell";
import {
  bridgeSupportsRoute,
  parseModelBridgeHealth,
  type ModelBridgeHealthCapabilities,
  type ModelBridgeHealthResponse,
} from "./ModelBridgeHealth.ts";

export type ModelBridgeStatus = "disabled" | "starting" | "ready" | "degraded" | "stopped";

export class ModelBridgeSupervisorError extends Data.TaggedError("ModelBridgeSupervisorError")<{
  readonly operation: string;
  readonly detail: string;
  readonly cause?: unknown;
}> {}

export interface ModelBridgeStatusSnapshot {
  readonly instanceId: ProviderInstanceId;
  readonly status: ModelBridgeStatus;
  readonly endpoint?: string;
  readonly configDir?: string;
  readonly bridgeVersion?: string;
  readonly capabilities?: ModelBridgeHealthCapabilities;
  readonly detail: string;
  readonly referenceCount: number;
}

export interface ModelBridgeLease {
  readonly instanceId: ProviderInstanceId;
  readonly endpoint: string;
  readonly configDir: string;
  readonly health: ModelBridgeHealthResponse;
}

export interface ModelBridgeProcess {
  readonly stop: Effect.Effect<void, ModelBridgeSupervisorError>;
  readonly isRunning: Effect.Effect<boolean, ModelBridgeSupervisorError>;
}

export interface ModelBridgeProcessFactory {
  readonly start: (input: {
    readonly executable: string;
    readonly args: ReadonlyArray<string>;
    readonly environment: NodeJS.ProcessEnv;
    readonly cwd: string;
  }) => Effect.Effect<ModelBridgeProcess, ModelBridgeSupervisorError>;
}

export interface ModelBridgeHealthProbe {
  readonly check: (input: {
    readonly endpoint: string;
    readonly healthPath: string;
  }) => Effect.Effect<unknown, ModelBridgeSupervisorError>;
}

export interface ModelBridgeSupervisorOptions {
  /** No executable means disabled/fail-closed. No environment variable is read. */
  readonly executable?: string;
  readonly healthPath?: string;
  readonly baseDir?: string;
  readonly extraArgs?: ReadonlyArray<string>;
  readonly environment?: Readonly<Record<string, string>>;
  readonly processFactory?: ModelBridgeProcessFactory;
  readonly healthProbe?: ModelBridgeHealthProbe;
  readonly reservePort?: () => Effect.Effect<number, NetService.NetError>;
}

export interface EnsureModelBridgeInput {
  readonly route: HarnessModelRoutePlan;
}

export interface ModelBridgeSupervisorShape {
  readonly ensureStarted: (
    input: EnsureModelBridgeInput,
  ) => Effect.Effect<ModelBridgeLease, ModelBridgeSupervisorError>;
  readonly release: (instanceId: ProviderInstanceId) => Effect.Effect<void>;
  readonly restart: (
    input: EnsureModelBridgeInput,
  ) => Effect.Effect<ModelBridgeLease, ModelBridgeSupervisorError>;
  readonly getStatus: (
    instanceId: ProviderInstanceId,
  ) => Effect.Effect<ModelBridgeStatusSnapshot>;
  readonly stopAll: Effect.Effect<void>;
}

export class ModelBridgeSupervisor extends Context.Service<
  ModelBridgeSupervisor,
  ModelBridgeSupervisorShape
>()("rune/provider/ModelBridgeSupervisor") {}

interface LiveBridge {
  readonly lease: ModelBridgeLease;
  readonly process: ModelBridgeProcess;
  readonly status: ModelBridgeStatusSnapshot;
}

const makeDefaultHealthProbe = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient;
  return {
    check: ({ endpoint, healthPath }) =>
      client.get(new URL(healthPath, endpoint).toString()).pipe(
        Effect.flatMap(HttpClientResponse.filterStatusOk),
        Effect.flatMap((response) => response.json),
        Effect.mapError(
          (cause) =>
            new ModelBridgeSupervisorError({
              operation: "health-check",
              detail: "Bridge health check failed.",
              cause,
            }),
        ),
      ),
  } satisfies ModelBridgeHealthProbe;
});

const processFactoryLive = (supervisorScope: Scope.Scope) => Effect.gen(function* () {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const platform = yield* HostProcessPlatform;
  const resolveCommand = (command: string, args: ReadonlyArray<string>, env: NodeJS.ProcessEnv) =>
    resolveSpawnCommand(command, args, { env });

  return {
    start: (input) =>
      Effect.gen(function* () {
        const spawnCommand = yield* resolveCommand(input.executable, input.args, input.environment);
        const child = yield* spawner
          .spawn(
            ChildProcess.make(spawnCommand.command, spawnCommand.args, {
              cwd: input.cwd,
              env: input.environment,
              extendEnv: false,
              shell: spawnCommand.shell,
              ...(platform === "win32" ? {} : { detached: true }),
            }),
          )
          .pipe(
            Effect.provideService(Scope.Scope, supervisorScope),
            Effect.mapError(
              (cause) =>
                new ModelBridgeSupervisorError({
                  operation: "start",
                  detail: "Failed to start the configured model bridge.",
                  cause,
                }),
            ),
          );

        return {
          stop: child.kill({ killSignal: "SIGTERM", forceKillAfter: "1 second" }).pipe(
            Effect.mapError(
              (cause) =>
                new ModelBridgeSupervisorError({
                  operation: "stop",
                  detail: "Failed to stop the model bridge.",
                  cause,
                }),
            ),
            Effect.asVoid,
          ),
          isRunning: child.isRunning.pipe(
            Effect.mapError(
              (cause) =>
                new ModelBridgeSupervisorError({
                  operation: "is-running",
                  detail: "Failed to inspect the model bridge process.",
                  cause,
                }),
            ),
          ),
        } satisfies ModelBridgeProcess;
      }),
  } satisfies ModelBridgeProcessFactory;
});

const makeSupervisor = (options: ModelBridgeSupervisorOptions = {}) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const net = yield* NetService.NetService;
    const supervisorScope = yield* Scope.Scope;
    const baseDir =
      options.baseDir ?? NodePath.join(NodeOS.homedir(), ".rune", "bridge-instances");
    const processFactory = options.processFactory ?? (yield* processFactoryLive(supervisorScope));
    const healthProbe = options.healthProbe ?? (yield* makeDefaultHealthProbe);
    const reservePort = options.reservePort ?? (() => net.findAvailablePort(0));
    const bridges = yield* Ref.make<ReadonlyMap<ProviderInstanceId, LiveBridge>>(new Map());

    const statusFor = (instanceId: ProviderInstanceId): Effect.Effect<ModelBridgeStatusSnapshot> =>
      Ref.get(bridges).pipe(
        Effect.map(
          (current) =>
            current.get(instanceId)?.status ?? {
              instanceId,
              status: options.executable === undefined ? "disabled" : "stopped",
              detail:
                options.executable === undefined
                  ? "No validated RUNE model bridge is bundled or configured."
                  : "Bridge has not been started.",
              referenceCount: 0,
            },
        ),
      );

    const stopBridge = (instanceId: ProviderInstanceId, bridge: LiveBridge) =>
      bridge.process.stop.pipe(
        Effect.andThen(
          fileSystem.remove(bridge.lease.configDir, { recursive: true, force: true }).pipe(
            Effect.mapError(
              (cause) =>
                new ModelBridgeSupervisorError({
                  operation: "cleanup",
                  detail: "Failed to clean the private model bridge directory.",
                  cause,
                }),
            ),
          ),
        ),
        Effect.andThen(
          Ref.update(bridges, (current) => {
            const next = new Map(current);
            next.delete(instanceId);
            return next;
          }),
        ),
        Effect.catchTag("ModelBridgeSupervisorError", (error) =>
          Ref.update(bridges, (current) => {
            const next = new Map(current);
            next.set(instanceId, {
              ...bridge,
              status: {
                ...bridge.status,
                status: "degraded",
                detail: error.detail,
                referenceCount: 0,
              },
            });
            return next;
          }).pipe(Effect.andThen(Effect.fail(error))),
        ),
      );

    const start = (input: EnsureModelBridgeInput) =>
      Effect.gen(function* () {
        if (input.route.routeKind !== "rune-bridge") {
          return yield* new ModelBridgeSupervisorError({
            operation: "start",
            detail: "Only rune-bridge routes can use the model bridge supervisor.",
          });
        }
        const executable = options.executable?.trim();
        if (!executable) {
          return yield* new ModelBridgeSupervisorError({
            operation: "start",
            detail: "No validated RUNE model bridge is bundled or configured.",
          });
        }

        const current = yield* Ref.get(bridges);
        const existing = current.get(input.route.instanceId);
        if (existing !== undefined) {
          const running = yield* existing.process.isRunning;
          if (running && existing.status.status === "ready") {
            yield* Ref.update(bridges, (next) => {
              const map = new Map(next);
              map.set(input.route.instanceId, {
                ...existing,
                status: { ...existing.status, referenceCount: existing.status.referenceCount + 1 },
              });
              return map;
            });
            return existing.lease;
          }
          yield* stopBridge(input.route.instanceId, existing).pipe(Effect.ignore);
        }

        const port = yield* reservePort().pipe(
          Effect.mapError(
            (cause) =>
              new ModelBridgeSupervisorError({
                operation: "allocate-port",
                detail: "Failed to allocate a loopback port for the model bridge.",
                cause,
              }),
          ),
        );
        const endpoint = `http://127.0.0.1:${port}/`;
        const configDir = NodePath.join(baseDir, String(input.route.instanceId));
        yield* fileSystem.makeDirectory(configDir, { recursive: true }).pipe(
          Effect.mapError(
            (cause) =>
              new ModelBridgeSupervisorError({
                operation: "prepare-config",
                detail: "Failed to create the private model bridge directory.",
                cause,
              }),
          ),
        );

        const status: ModelBridgeStatusSnapshot = {
          instanceId: input.route.instanceId,
          status: "starting",
          endpoint,
          configDir,
          detail: "Starting the instance-private model bridge.",
          referenceCount: 1,
        };
        const process = yield* processFactory.start({
          executable,
          cwd: configDir,
          args: [
            ...(options.extraArgs ?? []),
            "--host",
            "127.0.0.1",
            "--port",
            String(port),
            "--config-dir",
            configDir,
          ],
          environment: {
            ...options.environment,
            RUNE_MODEL_BRIDGE_CONFIG_DIR: configDir,
            RUNE_MODEL_BRIDGE_HOST: "127.0.0.1",
            RUNE_MODEL_BRIDGE_PORT: String(port),
          },
        }).pipe(
          Effect.tapError(() =>
            fileSystem.remove(configDir, { recursive: true, force: true }).pipe(Effect.ignore),
          ),
        );

        yield* Ref.update(bridges, (next) => {
          const map = new Map(next);
          map.set(input.route.instanceId, {
            lease: {
              instanceId: input.route.instanceId,
              endpoint,
              configDir,
              health: {
                status: "ready",
                capabilities: {
                  streaming: false,
                  tools: false,
                  usage: false,
                  images: false,
                  reasoningEffort: false,
                  protocols: [],
                },
              },
            },
            process,
            status,
          });
          return map;
        });

        const parsed = yield* healthProbe.check({
          endpoint,
          healthPath: options.healthPath ?? "/health",
        }).pipe(
          Effect.map((value) => parseModelBridgeHealth(value)),
          Effect.mapError((error) => error),
        );
        if (parsed.status === "invalid") {
          yield* stopBridge(input.route.instanceId, {
            lease: {
              instanceId: input.route.instanceId,
              endpoint,
              configDir,
              health: {
                status: "ready",
                capabilities: parsedHealthFallback,
              },
            },
            process,
            status,
          }).pipe(Effect.ignore);
          return yield* new ModelBridgeSupervisorError({
            operation: "health-check",
            detail: parsed.reason,
          });
        }
        if (
          !bridgeSupportsRoute(parsed, input.route.protocolFamily, {
            streaming: input.route.capabilities.streaming,
            tools: input.route.capabilities.tools,
            usage: input.route.capabilities.usage,
          })
        ) {
          yield* stopBridge(input.route.instanceId, {
            lease: { instanceId: input.route.instanceId, endpoint, configDir, health: parsed },
            process,
            status,
          }).pipe(Effect.ignore);
          return yield* new ModelBridgeSupervisorError({
            operation: "health-check",
            detail: `Bridge health does not support ${input.route.protocolFamily} with streaming, tools, and usage.`,
          });
        }

        const readyLease = {
          instanceId: input.route.instanceId,
          endpoint,
          configDir,
          health: parsed,
        } satisfies ModelBridgeLease;
        yield* Ref.update(bridges, (next) => {
          const map = new Map(next);
          map.set(input.route.instanceId, {
            lease: readyLease,
            process,
            status: {
              ...status,
              status: "ready",
              ...(parsed.version === undefined ? {} : { bridgeVersion: parsed.version }),
              capabilities: parsed.capabilities,
              detail: "Bridge is healthy and supports the selected route.",
            },
          });
          return map;
        });
        return readyLease;
      });

    const ensureStarted = (input: EnsureModelBridgeInput) => start(input);
    const release = (instanceId: ProviderInstanceId) =>
      Effect.gen(function* () {
        const current = yield* Ref.get(bridges);
        const bridge = current.get(instanceId);
        if (bridge === undefined) return;
        if (bridge.status.referenceCount > 1) {
          yield* Ref.update(bridges, (next) => {
            const map = new Map(next);
            map.set(instanceId, {
              ...bridge,
              status: { ...bridge.status, referenceCount: bridge.status.referenceCount - 1 },
            });
            return map;
          });
          return;
        }
        yield* stopBridge(instanceId, bridge).pipe(Effect.ignore);
      });
    const restart = (input: EnsureModelBridgeInput) =>
      release(input.route.instanceId).pipe(Effect.andThen(start(input)));
    const stopAll = Ref.get(bridges).pipe(
      Effect.flatMap((current) =>
        Effect.forEach(current, ([instanceId, bridge]) => stopBridge(instanceId, bridge), {
          discard: true,
        }),
      ),
      Effect.ignore,
    );

    yield* Scope.addFinalizer(supervisorScope, stopAll.pipe(Effect.ignore));
    return { ensureStarted, release, restart, getStatus: statusFor, stopAll } satisfies ModelBridgeSupervisorShape;
  });

// Used only while an invalid health response is being converted into a
// supervisor error. It contains no credentials and cannot be returned to the
// caller.
const parsedHealthFallback: ModelBridgeHealthCapabilities = {
  streaming: false,
  tools: false,
  usage: false,
  images: false,
  reasoningEffort: false,
  protocols: [],
};

export const makeModelBridgeSupervisor = (options: ModelBridgeSupervisorOptions = {}) =>
  makeSupervisor(options);
