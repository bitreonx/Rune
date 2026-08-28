import type {
  ActionApprovalPolicy,
  ActionEvidence,
  ActionId,
  ActionLifecycleState,
  ActionParameter,
  ActionParameterType,
  ActionParameterValue,
  ActionParameterValues,
  ActionProposal,
  ActionRunReceipt,
  ActionSource,
  ActionStep,
  ProjectScript,
  RuneAction,
} from "@rune/contracts";
import { ActionId as ActionIdSchema } from "@rune/contracts";

export type ActionShellPlatform = "win32" | "posix";
export type ActionParameterInput = Readonly<Record<string, ActionParameterValue>>;

export interface ActionParameterValidationFailure {
  readonly parameter: string;
  readonly reason: string;
}

export interface ValidatedActionParameters {
  readonly values: Readonly<Record<string, ActionParameterValue>>;
  readonly redacted: ActionParameterValues;
  readonly secretParameters: ReadonlySet<string>;
}

export type ActionParameterValidationResult =
  | { readonly ok: true; readonly parameters: ValidatedActionParameters }
  | { readonly ok: false; readonly failure: ActionParameterValidationFailure };

export type ActionPreparationResult =
  | {
      readonly ok: true;
      readonly action: RuneAction;
      readonly parameters: ValidatedActionParameters;
      readonly steps: ReadonlyArray<PreparedActionStep>;
      readonly requiresApproval: boolean;
    }
  | {
      readonly ok: false;
      readonly code:
        | "disabled"
        | "invalid-parameters"
        | "missing-credential"
        | "invalid-template";
      readonly message: string;
      readonly parameter?: string;
    };

export interface PreparedActionStep {
  readonly stepId: string;
  readonly command: string;
  /** Safe command for activity/trace; it never contains resolved secret values. */
  readonly displayCommand: string;
}

const ACTION_PARAMETER_NAME = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/u;
const CREDENTIAL_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SEMVER = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;
const TEMPLATE = /\{\{([A-Za-z][A-Za-z0-9_-]{0,63})\}\}/gu;
const UNRESOLVED_TEMPLATE = /\{\{|\}\}/u;

const dangerousCapabilities = new Set([
  "git-push",
  "deploy",
  "delete",
  "production-migration",
  "secret-reference",
]);

const intentSynonyms: Readonly<Record<string, string>> = {
  ship: "release",
  shipping: "release",
  publish: "release",
  published: "release",
  newest: "latest",
  next: "latest",
  installer: "version",
};

function slug(value: string): string {
  const normalized = value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 112)
    .replace(/-+$/gu, "");
  return normalized || "action";
}

/** Project-script ids are stable; changing a display name does not change the Action id. */
export function actionIdForProjectScript(scriptId: string): ActionId {
  return ActionIdSchema.make(`action.${slug(scriptId)}`);
}

export function actionIdForName(name: string): ActionId {
  return ActionIdSchema.make(`action.${slug(name)}`);
}

export function projectScriptToAction(
  script: ProjectScript,
  input: { readonly now: string; readonly source?: ActionSource } = { now: new Date().toISOString() },
): RuneAction {
  return {
    id: actionIdForProjectScript(script.id),
    name: script.name,
    scope: "project",
    kind: "command",
    source: input.source ?? "discovered",
    intentSignatures: [script.name, script.id],
    parameters: [],
    preconditions: [
      {
        id: "repository",
        kind: "repository-available",
        description: "The project workspace is available.",
        blocking: true,
      },
    ],
    steps: [
      {
        id: "run",
        name: script.name,
        kind: "run-command",
        command: script.command,
      },
    ],
    outputs: script.previewUrl
      ? [{ name: "preview", kind: "url", pattern: script.previewUrl }]
      : [],
    verification: [{ kind: "command-succeeded" }],
    approvalPolicy: "on-dangerous-step",
    fallbackPolicy: "agent",
    capabilities: [],
    provenance: {
      source: "project-script",
      successfulRunIds: [],
    },
    version: 1,
    enabled: true,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

function failure(parameter: string, reason: string): ActionParameterValidationResult {
  return { ok: false, failure: { parameter, reason } };
}

function validateValue(
  parameter: ActionParameter,
  value: ActionParameterValue,
): ActionParameterValidationResult {
  const type: ActionParameterType = parameter.type;
  if (typeof value === "string" && value.includes("\0")) {
    return failure(parameter.name, "NUL bytes are not valid action parameters.");
  }
  switch (type) {
    case "string":
      return typeof value === "string" && value.length > 0
        ? { ok: true, parameters: { values: {}, redacted: {}, secretParameters: new Set() } }
        : failure(parameter.name, "Expected a non-empty string.");
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? { ok: true, parameters: { values: {}, redacted: {}, secretParameters: new Set() } }
        : failure(parameter.name, "Expected a finite number.");
    case "integer":
      return typeof value === "number" && Number.isSafeInteger(value)
        ? { ok: true, parameters: { values: {}, redacted: {}, secretParameters: new Set() } }
        : failure(parameter.name, "Expected a safe integer.");
    case "boolean":
      return typeof value === "boolean"
        ? { ok: true, parameters: { values: {}, redacted: {}, secretParameters: new Set() } }
        : failure(parameter.name, "Expected a boolean.");
    case "enum":
      return typeof value === "string" && parameter.enumValues?.includes(value)
        ? { ok: true, parameters: { values: {}, redacted: {}, secretParameters: new Set() } }
        : failure(parameter.name, "Value is not one of the declared enum values.");
    case "path": {
      if (typeof value !== "string" || value.length === 0) {
        return failure(parameter.name, "Expected a non-empty workspace-relative path.");
      }
      const parts = value.split(/[\\/]+/u);
      return value.startsWith("/") || value.startsWith("\\") || /^[A-Za-z]:/u.test(value)
        ? failure(parameter.name, "Paths must be relative to the action workspace.")
        : parts.includes("..")
          ? failure(parameter.name, "Path traversal is not allowed.")
          : { ok: true, parameters: { values: {}, redacted: {}, secretParameters: new Set() } };
    }
    case "branch":
      return typeof value === "string" && value.length > 0 && !/[\s~^:?*[\\\]]/u.test(value) && !value.includes("..")
        ? { ok: true, parameters: { values: {}, redacted: {}, secretParameters: new Set() } }
        : failure(parameter.name, "Expected a safe git branch name.");
    case "semver":
      return typeof value === "string" && SEMVER.test(value)
        ? { ok: true, parameters: { values: {}, redacted: {}, secretParameters: new Set() } }
        : failure(parameter.name, "Expected a semantic version.");
    case "secret-reference":
      return typeof value === "string" && CREDENTIAL_REFERENCE.test(value)
        ? { ok: true, parameters: { values: {}, redacted: {}, secretParameters: new Set() } }
        : failure(parameter.name, "Expected a credential reference, never a secret value.");
  }
}

function validateParameterName(parameter: ActionParameter): ActionParameterValidationFailure | null {
  if (!ACTION_PARAMETER_NAME.test(parameter.name)) {
    return { parameter: parameter.name, reason: "Parameter names must be stable identifier names." };
  }
  if (parameter.secret && parameter.type !== "secret-reference") {
    return { parameter: parameter.name, reason: "Secret parameters must use a credential reference." };
  }
  if (parameter.type === "enum" && (!parameter.enumValues || parameter.enumValues.length === 0)) {
    return { parameter: parameter.name, reason: "Enum parameters must declare enum values." };
  }
  return null;
}

export function validateActionParameters(
  action: RuneAction,
  supplied: ActionParameterInput = {},
): ActionParameterValidationResult {
  const definitions = new Map<string, ActionParameter>();
  for (const parameter of action.parameters) {
    const invalidDefinition = validateParameterName(parameter);
    if (invalidDefinition) return { ok: false, failure: invalidDefinition };
    if (definitions.has(parameter.name)) {
      return failure(parameter.name, "Parameter names must be unique.");
    }
    definitions.set(parameter.name, parameter);
  }

  for (const name of Object.keys(supplied)) {
    if (!definitions.has(name)) return failure(name, "Unknown action parameter.");
  }

  const values: Record<string, ActionParameterValue> = {};
  const redacted: Record<string, ActionParameterValue> = {};
  const secretParameters = new Set<string>();
  for (const parameter of action.parameters) {
    const hasValue = Object.prototype.hasOwnProperty.call(supplied, parameter.name);
    const value = hasValue ? supplied[parameter.name] : parameter.defaultValue;
    if (value === undefined) {
      if (parameter.required) return failure(parameter.name, "Required parameter is missing.");
      continue;
    }
    const valueResult = validateValue(parameter, value);
    if (!valueResult.ok) return valueResult;
    values[parameter.name] = value;
    if (parameter.type === "secret-reference" || parameter.secret) {
      secretParameters.add(parameter.name);
      redacted[parameter.name] = "<credential-ref>";
    } else {
      redacted[parameter.name] = value;
    }
  }
  return { ok: true, parameters: { values, redacted, secretParameters } };
}

export function quoteActionParameter(value: ActionParameterValue, platform: ActionShellPlatform): string {
  const text = String(value);
  if (platform === "win32") return `'${text.replaceAll("'", "''")}'`;
  return `'${text.replaceAll("'", `'"'"'`)}'`;
}

function renderStep(
  step: ActionStep,
  values: Readonly<Record<string, ActionParameterValue>>,
  secretParameters: ReadonlySet<string>,
  platform: ActionShellPlatform,
): { readonly ok: true; readonly step: PreparedActionStep } | { readonly ok: false; readonly message: string; readonly parameter?: string } {
  const render = (redactSecrets: boolean): string | null => {
    let missingParameter: string | undefined;
    const command = step.command.replace(TEMPLATE, (_match, name: string) => {
      if (!Object.prototype.hasOwnProperty.call(values, name)) {
        missingParameter = name;
        return "";
      }
      return quoteActionParameter(
        redactSecrets && secretParameters.has(name) ? "<secret>" : values[name]!,
        platform,
      );
    });
    if (missingParameter) return null;
    if (UNRESOLVED_TEMPLATE.test(command)) return null;
    return command;
  };
  const command = render(false);
  if (!command) {
    const parameter = /\{\{([^}]+)\}\}/u.exec(step.command)?.[1];
    return {
      ok: false,
      message: parameter ? `Action step references missing parameter '${parameter}'.` : "Action step has an invalid parameter template.",
      ...(parameter ? { parameter } : {}),
    };
  }
  const displayCommand = render(true);
  if (!displayCommand) return { ok: false, message: "Action step has an invalid parameter template." };
  return { ok: true, step: { stepId: step.id, command, displayCommand } };
}

export function prepareActionExecution(input: {
  readonly action: RuneAction;
  readonly parameters?: ActionParameterInput;
  readonly platform: ActionShellPlatform;
  readonly resolveCredentialRef?: (reference: string) => string | undefined;
}): ActionPreparationResult {
  if (!input.action.enabled) {
    return { ok: false, code: "disabled", message: "Action is disabled." };
  }
  const validation = validateActionParameters(input.action, input.parameters ?? {});
  if (!validation.ok) {
    return {
      ok: false,
      code: "invalid-parameters",
      message: `${validation.failure.parameter}: ${validation.failure.reason}`,
      parameter: validation.failure.parameter,
    };
  }
  const resolvedValues: Record<string, ActionParameterValue> = { ...validation.parameters.values };
  for (const parameter of input.action.parameters) {
    if (parameter.type !== "secret-reference" || !Object.prototype.hasOwnProperty.call(resolvedValues, parameter.name)) {
      continue;
    }
    const reference = resolvedValues[parameter.name];
    if (typeof reference !== "string" || !input.resolveCredentialRef) {
      return {
        ok: false,
        code: "missing-credential",
        message: `Credential reference '${String(reference)}' cannot be resolved by this runtime.`,
        parameter: parameter.name,
      };
    }
    const secret = input.resolveCredentialRef(reference);
    if (secret === undefined) {
      return {
        ok: false,
        code: "missing-credential",
        message: `Credential reference '${reference}' is unavailable.`,
        parameter: parameter.name,
      };
    }
    resolvedValues[parameter.name] = secret;
  }
  const secretParameters = validation.parameters.secretParameters;
  const steps: PreparedActionStep[] = [];
  for (const actionStep of input.action.steps) {
    const rendered = renderStep(actionStep, resolvedValues, secretParameters, input.platform);
    if (!rendered.ok) {
      return {
        ok: false,
        code: "invalid-template",
        message: rendered.message,
        ...(rendered.parameter ? { parameter: rendered.parameter } : {}),
      };
    }
    steps.push(rendered.step);
  }
  const capabilities = new Set([
    ...input.action.capabilities,
    ...input.action.steps.flatMap((step) => step.capabilities ?? []),
  ]);
  const requiresApproval =
    input.action.approvalPolicy === "always" ||
    (input.action.approvalPolicy === "on-dangerous-step" &&
      [...capabilities].some((capability) => dangerousCapabilities.has(capability)));
  return {
    ok: true,
    action: input.action,
    parameters: { ...validation.parameters, values: resolvedValues },
    steps,
    requiresApproval,
  };
}

export function normalizeActionIntent(intent: string): string {
  return intent
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .map((token) => intentSynonyms[token] ?? token)
    .join(" ");
}

export function matchActionIntent(
  intent: string,
  action: Pick<RuneAction, "intentSignatures">,
): { readonly matched: boolean; readonly confidence: number; readonly signature: string | null } {
  const query = normalizeActionIntent(intent);
  if (!query) return { matched: false, confidence: 0, signature: null };
  let best = { confidence: 0, signature: null as string | null };
  for (const rawSignature of action.intentSignatures) {
    const signature = normalizeActionIntent(rawSignature);
    if (!signature) continue;
    if (signature === query) return { matched: true, confidence: 1, signature: rawSignature };
    const queryTokens = new Set(query.split(" "));
    const signatureTokens = new Set(signature.split(" "));
    const overlap = [...queryTokens].filter((token) => signatureTokens.has(token)).length;
    const confidence = overlap / Math.max(queryTokens.size, signatureTokens.size);
    if (confidence > best.confidence) best = { confidence, signature: rawSignature };
  }
  return { matched: best.confidence >= 0.7 && best.signature !== null, ...best };
}

const allowedTransitions: Readonly<Record<ActionLifecycleState, ReadonlySet<ActionLifecycleState>>> = {
  proposed: new Set(["approved"]),
  approved: new Set(["enabled", "disabled", "running"]),
  enabled: new Set(["disabled", "running"]),
  disabled: new Set(["enabled"]),
  running: new Set(["paused", "succeeded", "failed"]),
  paused: new Set(["running", "failed"]),
  succeeded: new Set(["running", "disabled"]),
  failed: new Set(["running", "disabled"]),
};

export function canTransitionActionLifecycle(
  current: ActionLifecycleState,
  next: ActionLifecycleState,
): boolean {
  return allowedTransitions[current].has(next);
}

export function setActionEnabled(action: RuneAction, enabled: boolean, at: string): RuneAction {
  return { ...action, enabled, updatedAt: at };
}

export function createLearnedActionProposal(input: {
  readonly action: RuneAction;
  readonly receipt: ActionRunReceipt;
  readonly proposalId: string;
  readonly reason: string;
  readonly createdAt: string;
}): ActionProposal | null {
  const verified = input.receipt.status === "succeeded" &&
    input.receipt.evidence.some((evidence: ActionEvidence) => evidence.kind === "verification");
  if (!verified) return null;
  return {
    proposalId: input.proposalId,
    action: { ...input.action, source: "learned", provenance: { ...input.action.provenance, successfulRunIds: [input.receipt.runId] } },
    reason: input.reason,
    successfulRunIds: [input.receipt.runId],
    status: "proposed",
    createdAt: input.createdAt,
  };
}

export function approveActionProposal(
  proposal: ActionProposal,
  input: { readonly approvedBy: string; readonly at: string },
): { readonly proposal: ActionProposal; readonly action: RuneAction } {
  const action = {
    ...proposal.action,
    enabled: true,
    updatedAt: input.at,
    provenance: { ...proposal.action.provenance, approvedBy: input.approvedBy },
  };
  return {
    proposal: { ...proposal, status: "approved", decidedAt: input.at },
    action,
  };
}

