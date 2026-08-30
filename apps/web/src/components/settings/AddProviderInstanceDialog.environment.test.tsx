import { EnvironmentId, ProviderDriverKind } from "@rune/contracts";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { isValidElement } from "react";

import { reactHookHarness as hooks } from "../../test/reactHookHarness";

const settingsHooks = vi.hoisted(() => ({
  read: vi.fn(() => ({ providerInstances: {} })),
  update: vi.fn(() => vi.fn()),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const { reactHookHarness } = await import("../../test/reactHookHarness");
  return {
    ...actual,
    useEffect: (effect: () => void) => {
      effect();
    },
    useCallback: reactHookHarness.useCallback,
    useMemo: reactHookHarness.useMemo,
    useRef: reactHookHarness.useRef,
    useState: reactHookHarness.useState,
  };
});

vi.mock("react/compiler-runtime", async () => {
  const { reactHookHarness } = await import("../../test/reactHookHarness");
  return { c: reactHookHarness.useMemoCache };
});

vi.mock("../../hooks/useSettings", () => ({
  useEnvironmentSettings: settingsHooks.read,
  useUpdateEnvironmentSettings: settingsHooks.update,
}));

import { AddProviderInstanceDialog } from "./AddProviderInstanceDialog";

function findElement(
  value: unknown,
  predicate: (element: { props: Record<string, unknown> }) => boolean,
): { props: Record<string, unknown> } | undefined {
  if (Array.isArray(value)) {
    for (const child of value) {
      const match = findElement(child, predicate);
      if (match) return match;
    }
    return undefined;
  }

  if (!isValidElement(value)) return undefined;

  const element = value as unknown as {
    props: Record<string, unknown>;
  };
  if (predicate(element)) return element;
  return findElement(element.props.children, predicate);
}

const remoteEnvironmentId = EnvironmentId.make("remote-device");

describe("AddProviderInstanceDialog environment routing", () => {
  beforeEach(() => {
    hooks.reset();
    settingsHooks.read.mockClear();
    settingsHooks.update.mockClear();
  });

  it("reads and writes settings through the supplied environment", () => {
    hooks.beginRender();
    AddProviderInstanceDialog({
      open: true,
      environmentId: remoteEnvironmentId,
      environmentLabel: "Remote device",
      onOpenChange: vi.fn(),
    });

    expect(settingsHooks.read).toHaveBeenCalledWith(remoteEnvironmentId);
    expect(settingsHooks.update).toHaveBeenCalledWith(remoteEnvironmentId);
  });

  it("projects contextual setup for each supported harness without Harness selection", () => {
    const harnesses = ["codex", "claudeAgent", "opencode", "antigravity"] as const;

    for (const driver of harnesses) {
      hooks.beginRender();
      const dialog = AddProviderInstanceDialog({
        open: true,
        environmentId: remoteEnvironmentId,
        environmentLabel: "Remote device",
        initialDriver: ProviderDriverKind.make(driver),
        onOpenChange: vi.fn(),
      });

      const wizard = findElement(
        dialog,
        (element) => "currentStep" in element.props && "summaries" in element.props,
      );

      expect(wizard?.props.steps).toEqual([
        "Identity",
        "Connection",
        "Model / Runtime",
        "Verify",
      ]);
      expect(wizard?.props.steps).not.toContain("Harness");
      expect(wizard?.props.currentStep).toBe(0);
    }
  });

  it("uses the global five-stage projection when no harness is preselected", () => {
    hooks.beginRender();
    const dialog = AddProviderInstanceDialog({
      open: true,
      environmentId: remoteEnvironmentId,
      environmentLabel: "Remote device",
      onOpenChange: vi.fn(),
    });

    const wizard = findElement(
      dialog,
      (element) =>
        "currentStep" in element.props && "summaries" in element.props,
    );

    expect(wizard?.props.steps).toEqual([
      "Harness",
      "Identity",
      "Connection / Config",
      "Model / Runtime",
      "Verify",
    ]);
  });
});
