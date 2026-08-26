export type ApiHarnessVerification = "unverified" | "verified" | "failed";

export type ApiHarnessEvidenceKind = "tool" | "verification";
export type ApiHarnessEvidenceStatus = "observed" | "passed" | "failed" | "invalidated";

export interface ApiOutcomeContract {
  readonly sourceText: string;
  readonly objective: string;
  readonly deliverables: ReadonlyArray<string>;
  readonly constraints: ReadonlyArray<string>;
}

export interface ApiHarnessEvidence {
  readonly id: string;
  readonly kind: ApiHarnessEvidenceKind;
  readonly label: string;
  readonly status: ApiHarnessEvidenceStatus;
  readonly detail: string;
  readonly failure?: ApiFailureCapsule;
}

export interface ApiHarnessSnapshot {
  readonly contract: ApiOutcomeContract;
  readonly verification: ApiHarnessVerification;
  readonly evidence: ReadonlyArray<ApiHarnessEvidence>;
  readonly latestFailure?: ApiFailureCapsule;
}

export interface ApiHarnessToolObservation {
  readonly toolName: string;
  readonly observation: string;
  readonly verificationTool?: boolean;
  readonly invalidatesVerification?: boolean;
}

export type ApiVerificationStatus = "passed" | "failed" | "unavailable";

export interface ApiFailureCapsule {
  readonly version: 1;
  readonly category: "verification";
  readonly summary: string;
  readonly expected: string;
  readonly actual: string;
  readonly command: string;
  readonly evidence: string;
  readonly nextAction: string;
}

export interface ApiVerificationResult {
  readonly status: ApiVerificationStatus;
  readonly checks: ReadonlyArray<{
    readonly index: number;
    readonly command: string;
    readonly exitCode: number;
  }>;
  readonly failure?: ApiFailureCapsule;
}

const MAX_SOURCE_CHARS = 8_000;
const MAX_EVIDENCE_DETAIL_CHARS = 500;
const MAX_EVIDENCE_ITEMS = 64;
const BULLET_PATTERN = /^(?:[-*]|\d+[.)])\s+/;
const CONSTRAINT_PATTERN = /^(?:must|need to|should|do not|don't|never|only|without)\b/i;

const compact = (text: string, maxChars: number): string => {
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.length <= maxChars ? normalized : `${normalized.slice(0, maxChars - 3)}...`;
};

const unique = (values: ReadonlyArray<string>): ReadonlyArray<string> => [
  ...new Set(values.filter((value) => value.length > 0)),
];

const stripBullet = (line: string): string => line.replace(BULLET_PATTERN, "").trim();

const redactSensitiveText = (text: string): string =>
  text
    .replace(/Bearer\s+[^\s,]+/gi, "Bearer [redacted]")
    .replace(
      /((?:authorization|x-api-key|api[-_ ]?key|token|password|secret)\s*[:=]\s*)[^\s,]+/gi,
      "$1[redacted]",
    );

export function parseVerificationObservation(observation: string): ApiVerificationResult {
  const checks: Array<{ index: number; command: string; exitCode: number }> = [];
  const pattern = /\bcheck\s+(\d+):\s*(.*?)\s+\bexit\s+(-?\d+)\b/gi;
  for (const match of observation.matchAll(pattern)) {
    const index = Number(match[1]);
    const exitCode = Number(match[3]);
    if (!Number.isInteger(index) || !Number.isInteger(exitCode)) continue;
    checks.push({ index, command: compact(match[2] ?? "focused check", 240), exitCode });
  }

  // Keep compatibility with bounded custom runners that report only exit
  // codes. The native run_checks tool emits the richer `check N: ... exit N`
  // form above, but an explicit exit code is still meaningful evidence.
  if (checks.length === 0) {
    let index = 1;
    for (const match of observation.matchAll(/\bexit\s+(-?\d+)\b/gi)) {
      const exitCode = Number(match[1]);
      if (Number.isInteger(exitCode)) {
        checks.push({ index, command: "focused check", exitCode });
        index += 1;
      }
    }
  }

  if (checks.length === 0) return { status: "unavailable", checks };
  const failed = checks.find((check) => check.exitCode !== 0);
  if (!failed) return { status: "passed", checks };

  const evidence = compact(redactSensitiveText(observation), 2_000);
  return {
    status: "failed",
    checks,
    failure: {
      version: 1,
      category: "verification",
      summary: `Focused verification failed at check ${failed.index}.`,
      expected: "Every focused check exits with code 0.",
      actual: `Check ${failed.index} exited with code ${failed.exitCode}.`,
      command: failed.command,
      evidence,
      nextAction: "Repair the failure, then rerun the same focused check.",
    },
  };
}

export function compileOutcomeContract(input: string): ApiOutcomeContract {
  const sourceText = input.trim().slice(0, MAX_SOURCE_CHARS);
  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => compact(line, 600))
    .filter((line) => line.length > 0);
  const objective =
    lines.find((line) => !BULLET_PATTERN.test(line) && !CONSTRAINT_PATTERN.test(line)) ??
    stripBullet(lines[0] ?? "Complete the requested workspace task.");
  const deliverables = unique(lines.filter((line) => BULLET_PATTERN.test(line)).map(stripBullet));
  const constraints = unique(
    lines.filter((line) => CONSTRAINT_PATTERN.test(line)).map((line) => compact(line, 600)),
  );

  return {
    sourceText,
    objective: compact(objective, 600),
    deliverables,
    constraints,
  };
}

export class ApiHarnessLedger {
  readonly #contract: ApiOutcomeContract;
  readonly #evidence: ApiHarnessEvidence[] = [];
  #nextEvidenceId = 1;

  constructor(contract: ApiOutcomeContract) {
    this.#contract = contract;
  }

  recordToolObservation(observation: ApiHarnessToolObservation): void {
    if (
      observation.invalidatesVerification === true &&
      !observation.observation.startsWith("Error:")
    ) {
      for (let index = 0; index < this.#evidence.length; index += 1) {
        const evidence = this.#evidence[index];
        if (evidence?.kind === "verification" && evidence.status === "passed") {
          this.#evidence[index] = {
            ...evidence,
            status: "invalidated",
            detail: "A workspace-mutating tool ran after this verification.",
          };
        }
      }
    }

    const isVerification = observation.verificationTool === true;
    const verificationResult = isVerification
      ? parseVerificationObservation(observation.observation)
      : undefined;
    const status: ApiHarnessEvidenceStatus = isVerification
      ? verificationResult?.status === "passed"
        ? "passed"
        : verificationResult?.status === "failed"
          ? "failed"
          : "observed"
      : "observed";
    this.#evidence.push({
      id: `evidence-${this.#nextEvidenceId++}`,
      kind: isVerification ? "verification" : "tool",
      label: observation.toolName,
      status,
      detail: compact(redactSensitiveText(observation.observation), MAX_EVIDENCE_DETAIL_CHARS),
      ...(verificationResult?.failure ? { failure: verificationResult.failure } : {}),
    });
    if (this.#evidence.length > MAX_EVIDENCE_ITEMS) this.#evidence.shift();
  }

  snapshot(): ApiHarnessSnapshot {
    const latestVerification = [...this.#evidence]
      .reverse()
      .find((evidence) => evidence.kind === "verification");
    const verification: ApiHarnessVerification =
      latestVerification?.status === "passed"
        ? "verified"
        : latestVerification?.status === "failed"
          ? "failed"
          : "unverified";

    const latestFailure =
      latestVerification?.status === "failed" ? latestVerification.failure : undefined;
    return {
      contract: this.#contract,
      verification,
      evidence: this.#evidence.map((evidence) => ({ ...evidence })),
      ...(latestFailure ? { latestFailure } : {}),
    };
  }

  promptSummary(): string {
    const snapshot = this.snapshot();
    const lines = [
      "OUTCOME CONTRACT (derived from the user's request; this is not proof)",
      `Objective: ${snapshot.contract.objective}`,
      ...(snapshot.contract.deliverables.length > 0
        ? ["Deliverables:", ...snapshot.contract.deliverables.map((item) => `- ${item}`)]
        : []),
      ...(snapshot.contract.constraints.length > 0
        ? ["Constraints:", ...snapshot.contract.constraints.map((item) => `- ${item}`)]
        : []),
      `Verification state: ${snapshot.verification}`,
      ...(snapshot.latestFailure
        ? [
            `Latest verification failure: ${snapshot.latestFailure.summary}`,
            `Actual: ${snapshot.latestFailure.actual}`,
            `Next action: ${snapshot.latestFailure.nextAction}`,
          ]
        : []),
      "Do not claim the task is complete without passing focused verification after the final mutation.",
    ];
    return lines.join("\n");
  }
}
