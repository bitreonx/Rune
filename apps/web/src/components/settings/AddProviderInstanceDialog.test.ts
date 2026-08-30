import { describe, expect, it } from "vite-plus/test";

import {
  ADD_PROVIDER_WIZARD_STEPS,
  CONTEXTUAL_ADD_PROVIDER_WIZARD_STEPS,
  resolveAddProviderInstanceDialogTitle,
  resolveAddProviderWizardSteps,
  resolveInitialWizardStep,
  resolveVisibleWizardStep,
  resolveWizardNavigation,
  resolveWizardReadiness,
  resolveWizardStep,
} from "./AddProviderInstanceDialog.logic";

describe("add-provider wizard stage projection", () => {
  it("keeps harness selection in the global add flow", () => {
    expect(resolveAddProviderWizardSteps(undefined)).toEqual(ADD_PROVIDER_WIZARD_STEPS);
    expect(ADD_PROVIDER_WIZARD_STEPS).toEqual([
      "Harness",
      "Identity",
      "Connection / Config",
      "Model / Runtime",
      "Verify",
    ]);
  });

  it("projects contextual entry to the required four visible stages", () => {
    expect(resolveAddProviderWizardSteps("codex")).toEqual(CONTEXTUAL_ADD_PROVIDER_WIZARD_STEPS);
    expect(CONTEXTUAL_ADD_PROVIDER_WIZARD_STEPS).toEqual([
      "Identity",
      "Connection",
      "Model / Runtime",
      "Verify",
    ]);
  });

  it("maps contextual visible steps onto the canonical state-machine steps", () => {
    expect(resolveWizardStep(undefined, 0)).toBe(0);
    expect(resolveWizardStep(undefined, 4)).toBe(4);
    expect(resolveWizardStep("claudeAgent", 0)).toBe(1);
    expect(resolveWizardStep("claudeAgent", 3)).toBe(4);
    expect(resolveVisibleWizardStep(undefined, 4)).toBe(4);
    expect(resolveVisibleWizardStep("claudeAgent", 4)).toBe(3);
  });

  it("uses the selected harness in contextual titles only", () => {
    expect(resolveAddProviderInstanceDialogTitle(undefined, "Codex")).toBe("Add harness instance");
    expect(resolveAddProviderInstanceDialogTitle("codex", "Codex")).toBe("Add Codex instance");
    expect(resolveAddProviderInstanceDialogTitle("claudeAgent", "Claude Code")).toBe(
      "Add Claude Code instance",
    );
  });
});

describe("resolveWizardNavigation", () => {
  const invalidId = { instanceIdError: "Instance ID is required." };
  const validId = { instanceIdError: null };

  it("allows moving from Harness to Identity before the instance id is valid", () => {
    expect(resolveWizardNavigation(0, 1, ADD_PROVIDER_WIZARD_STEPS.length, invalidId)).toEqual({
      kind: "navigate",
      step: 1,
    });
  });

  it("blocks Next from Identity to Connection while the instance id is invalid", () => {
    expect(resolveWizardNavigation(1, 2, ADD_PROVIDER_WIZARD_STEPS.length, invalidId)).toEqual({
      kind: "blocked",
      step: 1,
      error: "Instance ID is required.",
    });
  });

  it("stops a direct Harness-to-Connection skip at Identity and surfaces its error", () => {
    expect(resolveWizardNavigation(0, 2, ADD_PROVIDER_WIZARD_STEPS.length, invalidId)).toEqual({
      kind: "blocked",
      step: 1,
      error: "Instance ID is required.",
    });
  });

  it("allows advancing and skipping forward once the instance id is valid", () => {
    expect(resolveWizardNavigation(1, 2, ADD_PROVIDER_WIZARD_STEPS.length, validId)).toEqual({
      kind: "navigate",
      step: 2,
    });
    expect(resolveWizardNavigation(0, 2, ADD_PROVIDER_WIZARD_STEPS.length, validId)).toEqual({
      kind: "navigate",
      step: 2,
    });
    expect(resolveWizardNavigation(3, 4, ADD_PROVIDER_WIZARD_STEPS.length, validId)).toEqual({
      kind: "navigate",
      step: 4,
    });
  });

  it("always preserves backward Harness and Identity navigation", () => {
    expect(resolveWizardNavigation(2, 1, ADD_PROVIDER_WIZARD_STEPS.length, invalidId)).toEqual({
      kind: "navigate",
      step: 1,
    });
    expect(resolveWizardNavigation(2, 0, ADD_PROVIDER_WIZARD_STEPS.length, invalidId)).toEqual({
      kind: "navigate",
      step: 0,
    });
    expect(resolveWizardNavigation(1, 0, ADD_PROVIDER_WIZARD_STEPS.length, invalidId)).toEqual({
      kind: "navigate",
      step: 0,
    });
  });

  it("clamps requested steps to the wizard bounds", () => {
    expect(resolveWizardNavigation(2, 8, ADD_PROVIDER_WIZARD_STEPS.length, validId)).toEqual({
      kind: "navigate",
      step: ADD_PROVIDER_WIZARD_STEPS.length - 1,
    });
    expect(resolveWizardNavigation(0, -1, ADD_PROVIDER_WIZARD_STEPS.length, invalidId)).toEqual({
      kind: "navigate",
      step: 0,
    });
  });
});

describe("resolveWizardReadiness", () => {
  it("does not claim a host runtime is verified from local form state", () => {
    expect(
      resolveWizardReadiness({
        instanceIdError: null,
        requiredFieldCount: 0,
        configuredFieldCount: 0,
      }),
    ).toEqual({
      status: "pending-host-verification",
      label: "Pending host verification",
      detail:
        "The instance is ready to save. RUNE will verify the CLI, account, and models after it is added.",
    });
  });

  it("blocks save readiness when the instance identity is invalid", () => {
    expect(
      resolveWizardReadiness({
        instanceIdError: "Instance ID is required.",
        requiredFieldCount: 0,
        configuredFieldCount: 0,
      }),
    ).toEqual({
      status: "needs-configuration",
      label: "Needs configuration",
      detail: "Instance ID is required.",
    });
  });

  it("reports missing required fields without inventing provider verification", () => {
    expect(
      resolveWizardReadiness({
        instanceIdError: null,
        requiredFieldCount: 2,
        configuredFieldCount: 1,
      }),
    ).toMatchObject({
      status: "needs-configuration",
      label: "Needs configuration",
    });
  });
});

describe("contextual instance wizard", () => {
  it("starts at Identity for every supported contextual harness", () => {
    expect(resolveInitialWizardStep(undefined)).toBe(0);
    expect(resolveInitialWizardStep("codex")).toBe(1);
    expect(resolveInitialWizardStep("claudeAgent")).toBe(1);
    expect(resolveInitialWizardStep("opencode")).toBe(1);
    expect(resolveInitialWizardStep("antigravity")).toBe(1);
  });
});
