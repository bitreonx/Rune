import { ProviderDriverKind, ProviderInstanceId, type ServerProvider } from "@rune/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  buildHandoffCapsule,
  buildHandoffPrompt,
  isUsageExhaustionError,
  resolveHandoffDestinations,
} from "./handoffSurface.logic";

function provider(input: {
  readonly instanceId: string;
  readonly driver: string;
  readonly displayName?: string;
  readonly status?: ServerProvider["status"];
  readonly enabled?: boolean;
  readonly installed?: boolean;
  readonly availability?: ServerProvider["availability"];
  readonly models?: ReadonlyArray<{ slug: string; name: string; isDefault?: boolean }>;
}): ServerProvider {
  return {
    instanceId: ProviderInstanceId.make(input.instanceId),
    driver: ProviderDriverKind.make(input.driver),
    ...(input.displayName ? { displayName: input.displayName } : {}),
    enabled: input.enabled ?? true,
    installed: input.installed ?? true,
    version: "1.0.0",
    status: input.status ?? "ready",
    ...(input.availability ? { availability: input.availability } : {}),
    auth: { status: "authenticated" },
    checkedAt: "2026-08-29T00:00:00.000Z",
    models: (input.models ?? []).map((model) => ({
      slug: model.slug,
      name: model.name,
      isCustom: false,
      ...(model.isDefault ? { isDefault: true } : {}),
      capabilities: null,
    })),
    slashCommands: [],
    skills: [],
  };
}

describe("handoff surface", () => {
  it("offers real ready instances and preserves the requested model when available", () => {
    const destinations = resolveHandoffDestinations({
      providers: [
        provider({
          instanceId: "claude_work",
          driver: "claudeAgent",
          displayName: "Claude Work",
          models: [{ slug: "claude-opus", name: "Claude Opus" }],
        }),
        provider({
          instanceId: "codex_personal",
          driver: "codex",
          models: [
            { slug: "gpt-5.4", name: "GPT-5.4", isDefault: true },
            { slug: "gpt-5.4-mini", name: "GPT-5.4 mini" },
          ],
        }),
        provider({
          instanceId: "disabled",
          driver: "codex",
          enabled: false,
          models: [{ slug: "gpt-5.4", name: "GPT-5.4" }],
        }),
      ],
      currentInstanceId: ProviderInstanceId.make("claude_work"),
      currentModel: "gpt-5.4",
    });

    expect(destinations).toEqual([
      {
        instanceId: ProviderInstanceId.make("codex_personal"),
        driver: ProviderDriverKind.make("codex"),
        label: "Codex",
        model: "gpt-5.4",
        description: "Codex · GPT-5.4 · codex_personal",
      },
    ]);
  });

  it("recognizes quota exhaustion without turning ordinary provider failures into handoffs", () => {
    expect(isUsageExhaustionError("Usage limit reached for this account")).toBe(true);
    expect(isUsageExhaustionError("Provider credits exhausted")).toBe(true);
    expect(isUsageExhaustionError("Provider crashed while starting")).toBe(false);
    expect(isUsageExhaustionError(null)).toBe(false);
  });

  it("builds compact state from workspace-relative files and plan steps", () => {
    const capsule = buildHandoffCapsule({
      missionId: "thread-17",
      objective: "Finish the control center",
      acceptance: ["Git actions live in Changes"],
      workspaceId: "env-local",
      workspaceRoot: "D:/Apps/Rune",
      changedPaths: ["apps/web/src/App.tsx", "../secret.txt", "apps/web/src/App.tsx"],
      steps: [
        { step: "Inspect", status: "completed" },
        { step: "Wire handoff", status: "inProgress" },
      ],
      now: "2026-08-29T00:00:00.000Z",
    });

    expect(capsule.completedTaskIds).toEqual(["task-1"]);
    expect(capsule.currentTaskId).toBe("task-2");
    expect(capsule.changedFiles.map((file) => file.relativePath)).toEqual(["apps/web/src/App.tsx"]);
    expect(capsule.failedHypotheses).toEqual([]);
    expect(buildHandoffPrompt(capsule)).toContain("Changed files:\n- apps/web/src/App.tsx");
    expect(buildHandoffPrompt(capsule)).not.toContain("transcript:");
  });
});
