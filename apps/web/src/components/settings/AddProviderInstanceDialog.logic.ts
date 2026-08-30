export type WizardNavigation =
  | { readonly kind: "navigate"; readonly step: number }
  | { readonly kind: "blocked"; readonly step: number; readonly error: string };

export type WizardReadinessStatus =
  | "ready-to-save"
  | "needs-configuration"
  | "pending-host-verification";

export interface WizardReadiness {
  readonly status: WizardReadinessStatus;
  readonly label: string;
  readonly detail: string;
}

export function resolveWizardReadiness(input: {
  readonly instanceIdError: string | null;
  readonly requiredFieldCount: number;
  readonly configuredFieldCount: number;
}): WizardReadiness {
  if (input.instanceIdError !== null) {
    return {
      status: "needs-configuration",
      label: "Needs configuration",
      detail: input.instanceIdError,
    };
  }
  if (input.configuredFieldCount < input.requiredFieldCount) {
    return {
      status: "needs-configuration",
      label: "Needs configuration",
      detail: "Complete the required connection fields before saving this instance.",
    };
  }
  return {
    status: "pending-host-verification",
    label: "Pending host verification",
    detail:
      "The instance is ready to save. RUNE will verify the CLI, account, and models after it is added.",
  };
}

const IDENTITY_STEP = 1;

/** Stages shown when the add flow starts from Settings → Add harness. */
export const ADD_PROVIDER_WIZARD_STEPS = [
  "Harness",
  "Identity",
  "Connection / Config",
  "Model / Runtime",
  "Verify",
] as const;

/** Stages shown when the harness is already known from its detail page. */
export const CONTEXTUAL_ADD_PROVIDER_WIZARD_STEPS = [
  "Identity",
  "Connection",
  "Model / Runtime",
  "Verify",
] as const;

/**
 * Project the canonical wizard stages into the entry point's visible stages.
 * Contextual entry keeps the canonical Harness slot in the state machine so
 * the existing identity validation remains shared, but does not render it.
 */
export function resolveAddProviderWizardSteps(
  initialDriver: string | undefined,
): typeof ADD_PROVIDER_WIZARD_STEPS | typeof CONTEXTUAL_ADD_PROVIDER_WIZARD_STEPS {
  return initialDriver === undefined
    ? ADD_PROVIDER_WIZARD_STEPS
    : CONTEXTUAL_ADD_PROVIDER_WIZARD_STEPS;
}

/** Translate a visible step index to the canonical state-machine index. */
export function resolveWizardStep(initialDriver: string | undefined, visibleStep: number): number {
  return initialDriver === undefined ? visibleStep : visibleStep + IDENTITY_STEP;
}

/** Translate a canonical state-machine index to the visible step index. */
export function resolveVisibleWizardStep(
  initialDriver: string | undefined,
  wizardStep: number,
): number {
  return initialDriver === undefined ? wizardStep : wizardStep - IDENTITY_STEP;
}

/** Keep the global title generic and contextual titles tied to the harness. */
export function resolveAddProviderInstanceDialogTitle(
  initialDriver: string | undefined,
  harnessLabel: string,
): string {
  return initialDriver === undefined ? "Add harness instance" : `Add ${harnessLabel} instance`;
}

/**
 * Contextual instance entry points already know the harness family. Keep the
 * first screen for the global add flow only; an instance page must open on
 * identity instead of making the user select the same harness twice.
 */
export function resolveInitialWizardStep(initialDriver: string | undefined): number {
  return resolveWizardStep(initialDriver, 0);
}

/**
 * Resolve navigation within the add-provider wizard.
 *
 * Moving forward past Identity requires a valid instance id, whether the user
 * advances one step at a time or skips directly to Config from a step header.
 * A blocked skip lands on Identity so its existing inline validation is
 * visible. Backward navigation is always preserved.
 */
export function resolveWizardNavigation(
  currentStep: number,
  requestedStep: number,
  stepCount: number,
  validation: { readonly instanceIdError: string | null },
): WizardNavigation {
  const lastStep = Math.max(0, stepCount - 1);
  const targetStep = Math.max(0, Math.min(lastStep, requestedStep));
  const movesForwardPastIdentity = currentStep <= IDENTITY_STEP && targetStep > IDENTITY_STEP;

  if (movesForwardPastIdentity && validation.instanceIdError !== null) {
    return {
      kind: "blocked",
      step: Math.min(IDENTITY_STEP, lastStep),
      error: validation.instanceIdError,
    };
  }

  return { kind: "navigate", step: targetStep };
}
