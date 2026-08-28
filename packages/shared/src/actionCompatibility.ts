import type { RuneAction } from "@rune/contracts";

export interface ActionCompatibilityObservation {
  readonly osFamily?: string;
  readonly packageManager?: string;
  readonly toolVersions?: Readonly<Record<string, string>>;
  readonly inputHashes?: Readonly<Record<string, string>>;
  readonly outputPatterns?: ReadonlyArray<string>;
}

export interface ActionCompatibilityEvaluation {
  readonly status: "compatible" | "drifted" | "unverified";
  readonly reasons: ReadonlyArray<string>;
}

export type ActionRecoveryCause =
  | "drifted"
  | "unverified"
  | "precondition-failed"
  | "missing-script"
  | "execution-failed";

const normalize = (value: string): string => value.trim().toLowerCase();

const normalizeOsFamily = (value: string): string => {
  switch (normalize(value)) {
    case "win32":
    case "windows":
      return "windows";
    case "darwin":
    case "macos":
    case "mac":
      return "macos";
    case "linux":
      return "linux";
    default:
      return normalize(value);
  }
};

const compareRecord = (
  label: string,
  expected: Readonly<Record<string, string>> | undefined,
  observed: Readonly<Record<string, string>> | undefined,
): { readonly drifted: string[]; readonly unverified: string[] } => {
  if (expected === undefined) return { drifted: [], unverified: [] };
  if (observed === undefined) {
    return { drifted: [], unverified: [`${label} fingerprint could not be verified.`] };
  }
  const drifted: string[] = [];
  for (const [key, expectedValue] of Object.entries(expected)) {
    const observedValue = observed[key];
    if (observedValue === undefined) {
      drifted.push(`${label} '${key}' is no longer available.`);
    } else if (normalize(observedValue) !== normalize(expectedValue)) {
      drifted.push(`${label} '${key}' changed.`);
    }
  }
  return { drifted, unverified: [] };
};

/**
 * Compares only the structural facts supplied by the host. Missing facts are
 * not treated as compatible: a saved fingerprint must not silently become a
 * deterministic run merely because the runtime skipped an observation.
 */
export function evaluateActionCompatibility(input: {
  readonly action: Pick<RuneAction, "compatibility">;
  readonly observation: ActionCompatibilityObservation;
}): ActionCompatibilityEvaluation {
  const expected = input.action.compatibility;
  if (expected === undefined) return { status: "compatible", reasons: [] };

  const drifted: string[] = [];
  const unverified: string[] = [];
  if (expected.osFamily !== undefined) {
    if (input.observation.osFamily === undefined) {
      unverified.push("Operating-system fingerprint could not be verified.");
    } else if (
      normalizeOsFamily(input.observation.osFamily) !== normalizeOsFamily(expected.osFamily)
    ) {
      drifted.push(
        `Operating system changed from '${expected.osFamily}' to '${input.observation.osFamily}'.`,
      );
    }
  }
  if (expected.packageManager !== undefined) {
    if (input.observation.packageManager === undefined) {
      unverified.push("Package-manager fingerprint could not be verified.");
    } else if (normalize(input.observation.packageManager) !== normalize(expected.packageManager)) {
      drifted.push(
        `Package manager changed from '${expected.packageManager}' to '${input.observation.packageManager}'.`,
      );
    }
  }
  const toolVersions = compareRecord(
    "Tool version",
    expected.toolVersions,
    input.observation.toolVersions,
  );
  const inputHashes = compareRecord("Input", expected.inputHashes, input.observation.inputHashes);
  drifted.push(...toolVersions.drifted, ...inputHashes.drifted);
  unverified.push(...toolVersions.unverified, ...inputHashes.unverified);
  if (expected.outputPatterns !== undefined) {
    if (input.observation.outputPatterns === undefined) {
      unverified.push("Output-pattern fingerprint could not be verified.");
    } else {
      const observed = new Set(input.observation.outputPatterns.map(normalize));
      for (const pattern of expected.outputPatterns) {
        if (!observed.has(normalize(pattern))) {
          drifted.push(`Output pattern '${pattern}' changed.`);
        }
      }
    }
  }

  return drifted.length > 0
    ? { status: "drifted", reasons: drifted }
    : unverified.length > 0
      ? { status: "unverified", reasons: unverified }
      : { status: "compatible", reasons: [] };
}

export function actionRecoveryReason(input: {
  readonly strategy: "none" | "assisted-repair" | "agent";
  readonly cause: ActionRecoveryCause;
  readonly reasons: ReadonlyArray<string>;
}): string {
  const detail = input.reasons.join(" ");
  const title = input.cause === "drifted"
    ? "Action drift detected"
    : input.cause === "unverified"
      ? "Action compatibility is unverified"
      : input.cause === "precondition-failed"
        ? "Action preconditions failed"
        : input.cause === "missing-script"
          ? "The project script is missing"
          : "The action execution failed";
  switch (input.strategy) {
    case "assisted-repair":
      return `${title}. Focused repair is available. ${detail}`;
    case "agent":
      return `${title}. Agent fallback is available. ${detail}`;
    case "none":
      return `${title}; no fallback is configured. ${detail}`;
  }
}
