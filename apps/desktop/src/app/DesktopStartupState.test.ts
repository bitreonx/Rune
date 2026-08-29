import { assert, describe, it } from "@effect/vitest";

import {
  STARTUP_FAILURE_BUDGET_MS,
  STARTUP_NORMAL_COLD_START_BUDGET_MS,
  createInitialDesktopStartupState,
  desktopStartupView,
  transitionDesktopStartupState,
} from "./DesktopStartupState.ts";

describe("DesktopStartupState", () => {
  it("walks the launch milestones in order", () => {
    const initial = createInitialDesktopStartupState(1_000);
    const backend = transitionDesktopStartupState(initial, {
      type: "electron-ready",
      at: 1_100,
    });
    const ready = transitionDesktopStartupState(
      transitionDesktopStartupState(backend, { type: "backend-ready", at: 1_500 }),
      { type: "window-loading", at: 1_600 },
    );

    assert.equal(backend.stage, "backend-starting");
    assert.equal(ready.stage, "window-loading");
    assert.equal(transitionDesktopStartupState(ready, { type: "ready", at: 1_800 }).stage, "ready");
  });

  it("shows slow feedback before failing within a bounded window", () => {
    const initial = transitionDesktopStartupState(createInitialDesktopStartupState(0), {
      type: "backend-starting",
      at: 0,
    });
    const slow = transitionDesktopStartupState(initial, {
      type: "watchdog",
      at: STARTUP_NORMAL_COLD_START_BUDGET_MS,
    });
    const failed = transitionDesktopStartupState(slow, {
      type: "watchdog",
      at: STARTUP_FAILURE_BUDGET_MS,
    });

    assert.equal(slow.stage, "backend-slow");
    assert.deepEqual(desktopStartupView(slow).actions, ["open-logs", "quit"]);
    assert.equal(failed.stage, "startup-failed");
    assert.deepEqual(desktopStartupView(failed).actions, [
      "retry-backend",
      "open-logs",
      "restart",
      "quit",
    ]);
    assert.isString(desktopStartupView(failed).errorMessage);
  });

  it("retries from failure with a fresh bounded launch window", () => {
    const failed = transitionDesktopStartupState(createInitialDesktopStartupState(0), {
      type: "failed",
      at: 5_000,
      message: "port unavailable",
    });
    const retried = transitionDesktopStartupState(failed, { type: "retry", at: 5_100 });

    assert.equal(retried.stage, "backend-starting");
    assert.equal(retried.startedAt, 5_100);
    assert.equal(retried.attempt, 1);
    assert.isUndefined(retried.errorMessage);
  });

  it("does not regress a visible ready app when a stale event arrives", () => {
    const ready = transitionDesktopStartupState(createInitialDesktopStartupState(0), {
      type: "ready",
      at: 2_000,
    });

    assert.equal(
      transitionDesktopStartupState(ready, { type: "backend-starting", at: 2_100 }).stage,
      "ready",
    );
    assert.equal(
      transitionDesktopStartupState(ready, { type: "watchdog", at: STARTUP_FAILURE_BUDGET_MS })
        .stage,
      "ready",
    );
  });
});
