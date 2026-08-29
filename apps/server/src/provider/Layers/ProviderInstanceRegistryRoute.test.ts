import { describe, expect, it } from "@effect/vitest";
import { ProviderDriverKind, ProviderInstanceId } from "@rune/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { AnyProviderDriver } from "../ProviderDriver.ts";
import { makeProviderInstanceRegistry } from "./ProviderInstanceRegistryLive.ts";

const driver = ProviderDriverKind.make("claudeAgent");

const unavailableOnlyDriver: AnyProviderDriver = {
  driverKind: driver,
  metadata: { displayName: "Claude" },
  configSchema: Schema.Struct({}),
  defaultConfig: () => ({}),
  create: () => Effect.die("The registry must reject the route before create()."),
};

describe("ProviderInstanceRegistryLive route gate", () => {
  it.effect("shadows an unsupported cross-family route before provider creation", () =>
    Effect.gen(function* () {
      const instanceId = ProviderInstanceId.make("claude_codex");
      const { registry } = yield* Effect.scoped(
        makeProviderInstanceRegistry({
          drivers: [unavailableOnlyDriver],
          configMap: {
            [instanceId]: {
              driver,
              connectionId: "codex_work",
              serviceKind: "openai",
              protocol: "openai-responses",
              modelBindings: { main: "gpt-5.6" },
              enabled: false,
              config: {},
            },
          },
        }),
      );

      expect(yield* registry.listInstances).toEqual([]);
      const [snapshot] = yield* registry.listUnavailable;
      expect(snapshot?.availability).toBe("unavailable");
      expect(snapshot?.unavailableReason).toBe(
        "claudeAgent cannot use openai-responses through openai without a validated bridge.",
      );
    }),
  );
});
