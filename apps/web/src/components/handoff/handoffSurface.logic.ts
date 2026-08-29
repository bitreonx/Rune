import type {
  HandoffCapsule,
  ProviderDriverKind,
  ProviderInstanceId,
  ServerProvider,
  VerificationReceipt,
} from "@rune/contracts";

import { formatProviderDriverKindLabel } from "../../providerModels";

export interface HandoffDestination {
  readonly instanceId: ProviderInstanceId;
  readonly driver: ProviderDriverKind;
  readonly label: string;
  readonly model: string;
  readonly description: string;
}

export interface HandoffPlanStep {
  readonly step: string;
  readonly status: "pending" | "inProgress" | "completed";
}

export function resolveHandoffDestinations(input: {
  readonly providers: ReadonlyArray<ServerProvider>;
  readonly currentInstanceId: ProviderInstanceId | null;
  readonly currentModel: string;
}): ReadonlyArray<HandoffDestination> {
  return input.providers.flatMap((provider) => {
    if (
      provider.instanceId === input.currentInstanceId ||
      provider.availability === "unavailable" ||
      !provider.enabled ||
      !provider.installed ||
      provider.status !== "ready"
    ) {
      return [];
    }

    const model =
      provider.models.find((candidate) => candidate.slug === input.currentModel) ??
      provider.models.find((candidate) => candidate.isDefault === true) ??
      provider.models[0];
    if (!model) {
      return [];
    }

    const label = provider.displayName?.trim() || formatProviderDriverKindLabel(provider.driver);
    return [
      {
        instanceId: provider.instanceId,
        driver: provider.driver,
        label,
        model: model.slug,
        description: `${label} · ${model.name} · ${provider.instanceId}`,
      },
    ];
  });
}

export function isUsageExhaustionError(error: string | null | undefined): boolean {
  if (!error) return false;
  const normalized = error.toLowerCase();
  return [
    /\bquota\b/,
    /\busage\s+(?:limit|reached|exhausted)\b/,
    /\brate[- ]limit\b/,
    /\bcredits?\s+(?:limit|reached|exhausted)\b/,
    /\bexhausted\b/,
  ].some((pattern) => pattern.test(normalized));
}

function safeRelativePath(path: string): string | null {
  const normalized = path.trim().replaceAll("\\", "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.split("/").some((segment) => segment === ".." || segment === ".")
  ) {
    return null;
  }
  return normalized;
}

export function buildHandoffCapsule(input: {
  readonly missionId: string;
  readonly objective: string;
  readonly acceptance?: ReadonlyArray<string>;
  readonly workspaceId: string;
  readonly workspaceRoot: string;
  readonly changedPaths: ReadonlyArray<string>;
  readonly steps?: ReadonlyArray<HandoffPlanStep>;
  readonly failedHypotheses?: ReadonlyArray<string>;
  readonly verification?: ReadonlyArray<VerificationReceipt>;
  readonly nextAction?: string;
  readonly now: string;
}): HandoffCapsule {
  const changedPaths = [
    ...new Set(input.changedPaths.map(safeRelativePath).filter(Boolean)),
  ] as string[];
  const steps = input.steps ?? [];
  const completedTaskIds = steps.flatMap((step, index) =>
    step.status === "completed" ? [`task-${index + 1}`] : [],
  );
  const currentStep =
    steps.find((step) => step.status === "inProgress") ??
    steps.find((step) => step.status === "pending");
  const currentTaskId = currentStep ? `task-${steps.indexOf(currentStep) + 1}` : undefined;
  const objective = input.objective.trim() || "Continue the current objective";
  const acceptance = (input.acceptance ?? []).map((item) => item.trim()).filter(Boolean);
  const verifiedFacts = [
    {
      id: "workspace-context",
      kind: "runtime" as const,
      summary: "The continuation keeps the existing workspace context.",
      source: input.workspaceId,
      at: input.now,
    },
    ...(changedPaths.length > 0
      ? [
          {
            id: "changed-files",
            kind: "diff" as const,
            summary: `${changedPaths.length} changed ${changedPaths.length === 1 ? "file is" : "files are"} retained in the workspace.`,
            source: "thread.chatDiff",
            at: input.now,
          },
        ]
      : []),
  ];

  return {
    missionId: input.missionId.trim() || "mission",
    objective,
    acceptance,
    completedTaskIds,
    ...(currentTaskId ? { currentTaskId } : {}),
    verifiedFacts,
    failedHypotheses: (input.failedHypotheses ?? []).map((item) => item.trim()).filter(Boolean),
    changedFiles: changedPaths.map((relativePath) => ({
      workspaceId: input.workspaceId,
      workspaceRoot: input.workspaceRoot,
      relativePath,
    })),
    verification: [...(input.verification ?? [])],
    ...(input.nextAction?.trim()
      ? { nextAction: input.nextAction.trim() }
      : {
          nextAction:
            currentStep?.step ?? "Inspect the workspace state and continue the objective.",
        }),
  };
}

export function buildHandoffPrompt(capsule: HandoffCapsule): string {
  const lines = [
    "RUNE handoff capsule (compact continuation; no transcript follows)",
    `Mission: ${capsule.missionId}`,
    `Objective: ${capsule.objective}`,
  ];
  if (capsule.acceptance.length > 0) {
    lines.push("Acceptance:", ...capsule.acceptance.map((item) => `- ${item}`));
  }
  if (capsule.completedTaskIds.length > 0 || capsule.currentTaskId) {
    lines.push(
      "Task state:",
      ...(capsule.completedTaskIds.length > 0
        ? [`- Completed: ${capsule.completedTaskIds.join(", ")}`]
        : []),
      ...(capsule.currentTaskId ? [`- Current: ${capsule.currentTaskId}`] : []),
    );
  }
  if (capsule.changedFiles.length > 0) {
    lines.push("Changed files:", ...capsule.changedFiles.map((file) => `- ${file.relativePath}`));
  }
  if (capsule.verifiedFacts.length > 0) {
    lines.push("Verified facts:", ...capsule.verifiedFacts.map((fact) => `- ${fact.summary}`));
  }
  if (capsule.failedHypotheses.length > 0) {
    lines.push("Failed hypotheses:", ...capsule.failedHypotheses.map((item) => `- ${item}`));
  }
  if (capsule.verification.length > 0) {
    lines.push(
      "Verification:",
      ...capsule.verification.map(
        (receipt) => `- ${receipt.status}: ${receipt.summary} (${receipt.command})`,
      ),
    );
  }
  lines.push(
    `Next action: ${capsule.nextAction ?? "Inspect the workspace state and continue the objective."}`,
    "Continue in the existing workspace. Preserve current changes; do not reset or discard them.",
  );
  return lines.join("\n");
}
