import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  requestOsNotificationPermission,
  resolveOsNotificationPermission,
  shouldShowOsNotification,
} from "./notificationGate.ts";

interface FakeNotification {
  readonly permission: NotificationPermission;
  readonly requestPermission?: () => Promise<NotificationPermission>;
}

function installFakeNotification(notification: FakeNotification | null): void {
  if (notification === null) return;
  Object.defineProperty(globalThis, "window", {
    value: { Notification: notification },
    configurable: true,
  });
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("shouldShowOsNotification", () => {
  it("notifies when the window is unfocused and permission is granted", () => {
    expect(shouldShowOsNotification({ windowFocused: false, permission: "granted" })).toBe(true);
  });

  it("never notifies while the user is looking at the window", () => {
    expect(shouldShowOsNotification({ windowFocused: true, permission: "granted" })).toBe(false);
  });

  it("notifies when the tab is hidden even if focus reporting is inconsistent", () => {
    expect(
      shouldShowOsNotification({ windowFocused: true, documentHidden: true, permission: "granted" }),
    ).toBe(true);
  });

  it("stays silent without granted permission", () => {
    for (const permission of ["default", "denied", "unsupported"] as const) {
      expect(shouldShowOsNotification({ windowFocused: false, permission })).toBe(false);
    }
  });
});

describe("resolveOsNotificationPermission", () => {
  it("reports unsupported where the Notification API is absent", () => {
    expect(resolveOsNotificationPermission()).toBe("unsupported");
  });

  it("reads the browser permission when the API exists", () => {
    installFakeNotification({ permission: "granted" });
    expect(resolveOsNotificationPermission()).toBe("granted");
  });
});

describe("requestOsNotificationPermission", () => {
  it("resolves unsupported without prompting where the API is absent", async () => {
    await expect(requestOsNotificationPermission()).resolves.toBe("unsupported");
  });

  it("prompts the browser exactly once and reports its decision", async () => {
    let prompts = 0;
    installFakeNotification({
      permission: "default",
      requestPermission: async () => {
        prompts += 1;
        return "granted";
      },
    });
    await expect(requestOsNotificationPermission()).resolves.toBe("granted");
    expect(prompts).toBe(1);
  });

  it("falls back to the stored permission when prompting throws", async () => {
    installFakeNotification({
      permission: "denied",
      requestPermission: async () => {
        throw new Error("prompt blocked");
      },
    });
    await expect(requestOsNotificationPermission()).resolves.toBe("denied");
  });
});
