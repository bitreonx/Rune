import { assert, describe, it } from "@effect/vitest";

import {
  buildDesktopWakeLaunchPlan,
  DESKTOP_SCHEDULE_WAKE_ARGUMENT,
  parseDesktopWakeRequest,
  planDesktopWakeDispatch,
} from "./DesktopWakeCoordinator.ts";

const REQUEST = {
  installationId: "rune-installation-01",
  nonce: "0123456789abcdef_-",
} as const;

describe("DesktopWakeCoordinator", () => {
  it("builds a structured launch plan without shell quoting", () => {
    assert.deepEqual(
      buildDesktopWakeLaunchPlan({
        executablePath: "C:\\Program Files\\RUNE\\RUNE.exe",
        baseArgv: ["--user-data-dir", "C:\\Users\\Alice\\RUNE Data"],
        request: REQUEST,
      }),
      {
        executablePath: "C:\\Program Files\\RUNE\\RUNE.exe",
        argv: [
          "--user-data-dir",
          "C:\\Users\\Alice\\RUNE Data",
          DESKTOP_SCHEDULE_WAKE_ARGUMENT,
          REQUEST.installationId,
          REQUEST.nonce,
        ],
      },
    );
  });

  it("decodes only the separate structured wake arguments", () => {
    assert.deepEqual(
      parseDesktopWakeRequest([
        "rune.exe",
        DESKTOP_SCHEDULE_WAKE_ARGUMENT,
        REQUEST.installationId,
        REQUEST.nonce,
      ]),
      { tag: "request", request: REQUEST },
    );
    assert.deepEqual(
      parseDesktopWakeRequest([`${DESKTOP_SCHEDULE_WAKE_ARGUMENT}=bad`]),
      { tag: "invalid", reason: "equals-form-not-supported" },
    );
  });

  it("fails closed for duplicate, missing, and unsafe wake values", () => {
    assert.deepEqual(
      parseDesktopWakeRequest([
        DESKTOP_SCHEDULE_WAKE_ARGUMENT,
        REQUEST.installationId,
        REQUEST.nonce,
        DESKTOP_SCHEDULE_WAKE_ARGUMENT,
      ]),
      { tag: "invalid", reason: "duplicate-argument" },
    );
    assert.deepEqual(
      parseDesktopWakeRequest([DESKTOP_SCHEDULE_WAKE_ARGUMENT, REQUEST.installationId]),
      { tag: "invalid", reason: "missing-nonce" },
    );
    assert.deepEqual(
      parseDesktopWakeRequest([
        DESKTOP_SCHEDULE_WAKE_ARGUMENT,
        "../foreign-installation",
        REQUEST.nonce,
      ]),
      { tag: "invalid", reason: "invalid-installation-id" },
    );
    assert.isNull(
      buildDesktopWakeLaunchPlan({
        executablePath: "C:\\Program Files\\RUNE\\RUNE.exe",
        request: { ...REQUEST, nonce: "too-short" },
      }),
    );
  });

  it("routes cold starts to the available-start path", () => {
    assert.deepEqual(
      planDesktopWakeDispatch({
        source: "cold-start",
        argv: [DESKTOP_SCHEDULE_WAKE_ARGUMENT, REQUEST.installationId, REQUEST.nonce],
      }),
      { tag: "start-when-available", request: REQUEST },
    );
  });

  it("routes warm launches to the existing primary instead of spawning work", () => {
    assert.deepEqual(
      planDesktopWakeDispatch({
        source: "second-instance",
        argv: [DESKTOP_SCHEDULE_WAKE_ARGUMENT, REQUEST.installationId, REQUEST.nonce],
      }),
      { tag: "forward-to-existing-instance", request: REQUEST },
    );
  });

  it("ignores ordinary and malformed command lines", () => {
    assert.deepEqual(
      planDesktopWakeDispatch({ source: "cold-start", argv: ["rune.exe", "--version"] }),
      { tag: "ignore", reason: "no-request" },
    );
    assert.deepEqual(
      planDesktopWakeDispatch({
        source: "second-instance",
        argv: [DESKTOP_SCHEDULE_WAKE_ARGUMENT, REQUEST.installationId, "bad"],
      }),
      { tag: "ignore", reason: "invalid-nonce" },
    );
  });
});
