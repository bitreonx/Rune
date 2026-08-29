import { ProcessFailureClass, type ProcessFailureClass as ProcessFailureKind } from "../processRunner.ts";

export type CommandRecoveryDecision =
  | {
      readonly tag: "retry";
      readonly command: string;
      readonly args: ReadonlyArray<string>;
      readonly reason: string;
    }
  | {
      readonly tag: "stop";
      readonly reason: string;
    };

const PACKAGE_MANAGER_COMMANDS = new Set(["pnpm", "npm", "npx", "vp"]);

const normalizeCommand = (command: string, platform: NodeJS.Platform): string =>
  platform === "win32" ? command.trim().toLowerCase() : command.trim();

const commandFingerprint = (input: {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd?: string;
  readonly failure: ProcessFailureKind;
  readonly platform: NodeJS.Platform;
}): string =>
  JSON.stringify([
    normalizeCommand(input.command, input.platform),
    input.args,
    input.cwd ?? "",
    input.failure,
  ]);

/**
 * Decide only repairs that preserve user intent losslessly. Repeated identical
 * failures stop locally so a model does not spend the rest of a turn retrying
 * one broken strategy.
 */
export const decideCommandRecovery = (input: {
  readonly platform: NodeJS.Platform;
  readonly command: string;
  readonly args: ReadonlyArray<string>;
  readonly cwd?: string;
  readonly failure: ProcessFailureKind;
  readonly previousFailures?: ReadonlyMap<string, number>;
}): CommandRecoveryDecision => {
  const fingerprint = commandFingerprint(input);
  const previousCount = input.previousFailures?.get(fingerprint) ?? 0;
  if (previousCount >= 2) {
    return {
      tag: "stop",
      reason: "The same command strategy failed twice; change strategy instead of retrying it.",
    };
  }

  if (input.platform === "win32" && input.failure === ProcessFailureClass.shellNotFound) {
    const normalized = normalizeCommand(input.command, input.platform);
    if (normalized === "pwsh" || normalized === "pwsh.exe") {
      return {
        tag: "retry",
        command: "powershell.exe",
        args: [...input.args],
        reason: "PowerShell 7 is unavailable; retrying with Windows PowerShell.",
      };
    }
  }

  if (input.platform === "win32" && input.failure === ProcessFailureClass.executableNotFound) {
    const normalized = normalizeCommand(input.command, input.platform);
    if (PACKAGE_MANAGER_COMMANDS.has(normalized)) {
      return {
        tag: "retry",
        command: `${normalized}.cmd`,
        args: [...input.args],
        reason: "Retrying through the Windows command shim without shell parsing.",
      };
    }
  }

  return {
    tag: "stop",
    reason: "No lossless local repair is available; preserve stderr and choose a different strategy.",
  };
};

export const commandFingerprintForRecovery = commandFingerprint;
