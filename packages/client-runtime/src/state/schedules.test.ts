import { EnvironmentId } from "@rune/contracts";
import { describe, expect, it } from "@effect/vitest";
import * as Layer from "effect/Layer";
import { Atom } from "effect/unstable/reactivity";

import type { EnvironmentRegistry } from "../connection/registry.ts";
import { createSchedulesEnvironmentAtoms } from "./schedules.ts";

describe("createSchedulesEnvironmentAtoms", () => {
  it("keeps schedule queries stable per environment and input", () => {
    const runtime = Atom.runtime(Layer.empty) as unknown as Atom.AtomRuntime<
      EnvironmentRegistry,
      never
    >;
    const schedules = createSchedulesEnvironmentAtoms(runtime);
    const firstEnvironment = EnvironmentId.make("environment-1");
    const secondEnvironment = EnvironmentId.make("environment-2");

    expect(schedules.list({ environmentId: firstEnvironment, input: {} })).toBe(
      schedules.list({ environmentId: firstEnvironment, input: {} }),
    );
    expect(schedules.list({ environmentId: firstEnvironment, input: {} })).not.toBe(
      schedules.list({ environmentId: secondEnvironment, input: {} }),
    );
    expect(schedules.runs({ environmentId: firstEnvironment, input: {} })).toBe(
      schedules.runs({ environmentId: firstEnvironment, input: {} }),
    );
  });

  it("exposes serialized lifecycle commands with separate labels", () => {
    const runtime = Atom.runtime(Layer.empty) as unknown as Atom.AtomRuntime<
      EnvironmentRegistry,
      never
    >;
    const schedules = createSchedulesEnvironmentAtoms(runtime);

    expect(schedules.create.label).toBe("environment-command:schedules:create");
    expect(schedules.pause.label).toBe("environment-command:schedules:pause");
    expect(schedules.resume.label).toBe("environment-command:schedules:resume");
    expect(schedules.remove.label).toBe("environment-command:schedules:delete");
    expect(schedules.runNow.label).toBe("environment-command:schedules:run-now");
  });
});
