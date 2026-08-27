import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
import { ChildProcessSpawner } from "effect/unstable/process";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { AntigravitySettings } from "@rune/contracts";
import {
  buildInitialAntigravityProviderSnapshot,
  checkAntigravityProviderStatus,
} from "./AntigravityProvider.ts";

const decodeSettings = Schema.decodeUnknownSync(AntigravitySettings);

function makeProbeSpawner(modelsOutput: string) {
  return ChildProcessSpawner.make((command) => {
    const args = (command as unknown as { readonly args: ReadonlyArray<string> }).args;
    const stdout = args.includes("--version") ? "agy 1.1.19\n" : modelsOutput;
    return Effect.succeed(
      ChildProcessSpawner.makeHandle({
        pid: ChildProcessSpawner.ProcessId(1),
        exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
        isRunning: Effect.succeed(false),
        kill: () => Effect.void,
        unref: Effect.succeed(Effect.void),
        stdin: Sink.drain,
        stdout: Stream.encodeText(Stream.make(stdout)),
        stderr: Stream.empty,
        all: Stream.empty,
        getInputFd: () => Sink.drain,
        getOutputFd: () => Stream.empty,
      }),
    );
  });
}

function makeSlowModelsSpawner() {
  return ChildProcessSpawner.make((command) => {
    const args = (command as unknown as { readonly args: ReadonlyArray<string> }).args;
    const isVersionProbe = args.includes("--version");
    return Effect.succeed(
      ChildProcessSpawner.makeHandle({
        pid: ChildProcessSpawner.ProcessId(1),
        exitCode: isVersionProbe ? Effect.succeed(ChildProcessSpawner.ExitCode(0)) : Effect.never,
        isRunning: Effect.succeed(!isVersionProbe),
        kill: () => Effect.void,
        unref: Effect.succeed(Effect.void),
        stdin: Sink.drain,
        stdout: isVersionProbe ? Stream.encodeText(Stream.make("agy 1.1.22\n")) : Stream.never,
        stderr: Stream.empty,
        all: Stream.empty,
        getInputFd: () => Sink.drain,
        getOutputFd: () => Stream.empty,
      }),
    );
  });
}

describe("Antigravity provider snapshot", () => {
  it.effect("starts with a visible fallback model while the CLI health check is pending", () =>
    Effect.gen(function* () {
      const snapshot = yield* buildInitialAntigravityProviderSnapshot(
        decodeSettings({ customModels: ["team/agy-review"] }),
      );

      expect(snapshot.displayName).toBe("Antigravity");
      expect(snapshot.status).toBe("warning");
      expect(snapshot.models.map((model) => model.slug)).toEqual([
        "gemini-3.7-flash-high",
        "team/agy-review",
      ]);
      expect(snapshot.models[0]?.capabilities?.optionDescriptors).toEqual([
        expect.objectContaining({ id: "effort", type: "select" }),
      ]);
    }),
  );

  it.effect("keeps disabled Antigravity visible without claiming the CLI is installed", () =>
    Effect.gen(function* () {
      const snapshot = yield* buildInitialAntigravityProviderSnapshot(
        decodeSettings({ enabled: false }),
      );

      expect(snapshot.enabled).toBe(false);
      expect(snapshot.status).toBe("disabled");
      expect(snapshot.installed).toBe(false);
      expect(snapshot.message).toContain("disabled");
    }),
  );
});

it.layer(Layer.mergeAll(NodeServices.layer))("Antigravity provider health", (it) => {
  it.effect("keeps the fallback model but does not claim readiness for an empty catalog", () =>
    Effect.gen(function* () {
      const snapshot = yield* checkAntigravityProviderStatus(
        decodeSettings({ binaryPath: "agy" }),
      ).pipe(
        Effect.provideService(
          ChildProcessSpawner.ChildProcessSpawner,
          makeProbeSpawner("Fetching available models...\n"),
        ),
      );

      expect(snapshot.status).toBe("warning");
      expect(snapshot.auth.status).toBe("unknown");
      expect(snapshot.message).toContain("no usable models");
      expect(snapshot.models[0]?.slug).toBe("gemini-3.7-flash-high");
    }),
  );

  it.effect("marks a discovered catalog ready and preserves custom models", () =>
    Effect.gen(function* () {
      const snapshot = yield* checkAntigravityProviderStatus(
        decodeSettings({ binaryPath: "agy", customModels: ["team/agy-review"] }),
      ).pipe(
        Effect.provideService(
          ChildProcessSpawner.ChildProcessSpawner,
          makeProbeSpawner(
            [
              "gemini-3.7-flash-high\tGemini 3.7 Flash (High)",
              "claude-sonnet-4-6\tClaude Sonnet 4.6 (Thinking)",
            ].join("\n"),
          ),
        ),
      );

      expect(snapshot.status).toBe("ready");
      expect(snapshot.auth.status).toBe("authenticated");
      expect(snapshot.models.map((model) => model.slug)).toEqual([
        "gemini-3.7-flash-high",
        "claude-sonnet-4-6",
        "team/agy-review",
      ]);
    }),
  );

  it.effect("keeps the verified CLI ready when model discovery exceeds its soft timeout", () =>
    Effect.gen(function* () {
      const snapshot = yield* checkAntigravityProviderStatus(
        decodeSettings({ binaryPath: "agy" }),
        process.env,
        { modelProbeTimeoutMs: 0 },
      ).pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, makeSlowModelsSpawner()),
      );

      expect(snapshot.status).toBe("ready");
      expect(snapshot.installed).toBe(true);
      expect(snapshot.models[0]?.slug).toBe("gemini-3.7-flash-high");
      expect(snapshot.message).toContain("using the configured default model");
    }),
  );
});
