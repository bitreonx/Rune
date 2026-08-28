import * as NodeServices from "@effect/platform-node/NodeServices";
import { windowsPowerShellArgs } from "@rune/shared/shell";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as ProcessRunner from "./processRunner.ts";

const liveLayer = ProcessRunner.layer.pipe(Layer.provide(NodeServices.layer));

describe.runIf(process.platform === "win32")("ProcessRunner Windows PowerShell boundary", () => {
  it.effect("executes one complete PowerShell program with argv-safe process spawning", () =>
    Effect.gen(function* () {
      const runner = yield* ProcessRunner.ProcessRunner;
      const result = yield* runner.run({
        command: "pwsh.exe",
        args: windowsPowerShellArgs("$value = 'RUNE|windows'; Write-Output $value"),
        cwd: process.cwd(),
        timeout: "10 seconds",
      });
      expect(result.code).toBe(0);
      expect(result.stdout.trim()).toBe("RUNE|windows");
      expect(result.stderr).toBe("");
    }).pipe(Effect.provide(liveLayer)),
  );
});
