import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { confirmMock, readLocalApiMock } = vi.hoisted(() => {
  const confirmMock = vi.fn<(message: string, options?: unknown) => Promise<boolean>>();
  const readLocalApiMock = vi.fn<
    () =>
      | {
          dialogs: { confirm: (message: string, options?: unknown) => Promise<boolean> };
        }
      | undefined
  >();
  return { confirmMock, readLocalApiMock };
});

vi.mock("~/localApi", () => ({
  readLocalApi: () => readLocalApiMock(),
}));

import { confirmTerminalClose, isTerminalCloseConfirmPending } from "./terminalCloseConfirm";

describe("terminal close confirmation", () => {
  beforeEach(() => {
    confirmMock.mockReset();
    readLocalApiMock.mockReset();
    readLocalApiMock.mockReturnValue({ dialogs: { confirm: confirmMock } });
  });

  it("tracks pending state until the confirmation settles", async () => {
    let settle: (value: boolean) => void = () => undefined;
    confirmMock.mockImplementation(() => new Promise<boolean>((resolve) => (settle = resolve)));

    expect(isTerminalCloseConfirmPending()).toBe(false);

    const confirmation = confirmTerminalClose(["Terminal 1"]);
    expect(isTerminalCloseConfirmPending()).toBe(true);

    settle(true);
    await expect(confirmation).resolves.toBe(true);
    expect(isTerminalCloseConfirmPending()).toBe(false);
  });

  it("clears pending state and resolves false when the dialog rejects", async () => {
    let reject: (reason?: unknown) => void = () => undefined;
    confirmMock.mockImplementation(
      () =>
        new Promise<boolean>((_resolve, rejectPromise) => {
          reject = rejectPromise;
        }),
    );

    const confirmation = confirmTerminalClose(["Terminal 1"]);
    expect(isTerminalCloseConfirmPending()).toBe(true);

    reject(new Error("dialog failed"));
    await expect(confirmation).resolves.toBe(false);
    expect(isTerminalCloseConfirmPending()).toBe(false);
  });

  it("names every terminal in a multi-terminal close", async () => {
    confirmMock.mockResolvedValue(true);

    await expect(confirmTerminalClose(["Terminal 1", "Development server"])).resolves.toBe(true);
    expect(confirmMock).toHaveBeenCalledWith(
      [
        "Close 2 terminals?",
        'This stops their running processes and clears their histories: "Terminal 1", "Development server".',
      ].join("\n"),
      { variant: "destructive" },
    );
  });

  it("falls back to browser confirm when no local API is available", async () => {
    readLocalApiMock.mockReturnValue(undefined);
    const browserConfirmMock = vi.fn<(message: string) => boolean>();
    vi.stubGlobal("confirm", browserConfirmMock);
    try {
      browserConfirmMock.mockReturnValue(false);
      await expect(confirmTerminalClose(["Terminal 1"])).resolves.toBe(false);
      expect(browserConfirmMock).toHaveBeenCalledWith(
        [
          'Close terminal "Terminal 1"?',
          "This stops the running process and clears its history.",
        ].join("\n"),
      );

      browserConfirmMock.mockReturnValue(true);
      await expect(confirmTerminalClose(["Terminal 1"])).resolves.toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("names every terminal in the browser fallback for a multi-terminal close", async () => {
    readLocalApiMock.mockReturnValue(undefined);
    const browserConfirmMock = vi.fn<(message: string) => boolean>();
    browserConfirmMock.mockReturnValue(true);
    vi.stubGlobal("confirm", browserConfirmMock);
    try {
      await expect(confirmTerminalClose(["Terminal 1", "Development server"])).resolves.toBe(true);
      expect(browserConfirmMock).toHaveBeenCalledWith(
        [
          "Close 2 terminals?",
          'This stops their running processes and clears their histories: "Terminal 1", "Development server".',
        ].join("\n"),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
