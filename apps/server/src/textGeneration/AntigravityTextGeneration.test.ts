import { it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
import { ChildProcessSpawner } from "effect/unstable/process";
import { expect } from "vite-plus/test";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { AntigravitySettings, ProviderInstanceId } from "@t3tools/contracts";
import { createModelSelection } from "@t3tools/shared/model";

import { makeAntigravityTextGeneration } from "./AntigravityTextGeneration.ts";

const decodeSettings = Schema.decodeSync(AntigravitySettings);
const encodeJson = Schema.encodeSync(Schema.fromJsonString(Schema.Unknown));
const antigravityTextGenerationTestLayer = Layer.mergeAll(NodeServices.layer);

it.layer(antigravityTextGenerationTestLayer)("AntigravityTextGeneration", (it) => {
  it.effect("forwards model/effort, decodes a JSON envelope, and keeps permissions explicit", () =>
    Effect.gen(function* () {
      const commands: ReadonlyArray<string>[] = [];
      const output = encodeJson({
        response: encodeJson({ title: "Investigate Antigravity" }),
      });
      const spawner = ChildProcessSpawner.make((command) => {
        const childCommand = command as unknown as { readonly args: ReadonlyArray<string> };
        commands.push([...childCommand.args]);
        return Effect.succeed(
          ChildProcessSpawner.makeHandle({
            pid: ChildProcessSpawner.ProcessId(1),
            exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
            isRunning: Effect.succeed(false),
            kill: () => Effect.void,
            unref: Effect.succeed(Effect.void),
            stdin: Sink.drain,
            stdout: Stream.encodeText(Stream.make(output)),
            stderr: Stream.empty,
            all: Stream.empty,
            getInputFd: () => Sink.drain,
            getOutputFd: () => Stream.empty,
          }),
        );
      });
      const textGeneration = yield* makeAntigravityTextGeneration(
        decodeSettings({ binaryPath: "agy" }),
      ).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner));

      const generated = yield* textGeneration.generateThreadTitle({
        cwd: process.cwd(),
        message: "the provider health check is unclear",
        modelSelection: createModelSelection(
          ProviderInstanceId.make("antigravity"),
          "gemini-3.7-flash-high",
          [{ id: "effort", value: "high" }],
        ),
      });

      expect(generated.title).toBe("Investigate Antigravity");
      expect(commands).toHaveLength(1);
      expect(commands[0]).toEqual(
        expect.arrayContaining([
          "-p",
          "--output-format",
          "json",
          "--model",
          "gemini-3.7-flash-high",
          "--effort",
          "high",
        ]),
      );
      expect(commands[0]).not.toContain("--dangerously-skip-permissions");
    }),
  );
});
