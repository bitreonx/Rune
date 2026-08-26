/**
 * Claude model-role pins for a provider instance.
 *
 * The Claude CLI resolves its subagent / background-task models through
 * role environment variables (`ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL`
 * plus the legacy `ANTHROPIC_SMALL_FAST_MODEL`). Pinning a role routes every
 * request that role makes to the chosen gateway model. Variables set by hand
 * in the advanced environment editor always win: these helpers only manage
 * their four documented names and leave everything else untouched.
 *
 * @module claudeRoles
 */
import type {
  ProviderInstanceEnvironment,
  ProviderInstanceEnvironmentVariable,
} from "@rune/contracts";

export const CLAUDE_ROLE_KEYS = ["opus", "sonnet", "haiku"] as const;
export type ClaudeRoleKey = (typeof CLAUDE_ROLE_KEYS)[number];
export type ClaudeRoleModels = Record<ClaudeRoleKey, string>;

const ROLE_VARIABLE_NAMES: Readonly<Record<ClaudeRoleKey, string>> = {
  opus: "ANTHROPIC_DEFAULT_OPUS_MODEL",
  sonnet: "ANTHROPIC_DEFAULT_SONNET_MODEL",
  haiku: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
};

export const CLAUDE_ROLE_ENVIRONMENT_VARIABLE_NAMES: ReadonlyArray<string> = [
  ROLE_VARIABLE_NAMES.opus,
  ROLE_VARIABLE_NAMES.sonnet,
  ROLE_VARIABLE_NAMES.haiku,
  // Kept in lockstep with the haiku pin: older CLIs read this name instead.
  "ANTHROPIC_SMALL_FAST_MODEL",
];

export function readClaudeRoleModels(
  environment: ReadonlyArray<ProviderInstanceEnvironmentVariable>,
): Partial<ClaudeRoleModels> {
  const roles: Partial<ClaudeRoleModels> = {};
  let sawSmallFast = false;
  for (const variable of environment) {
    if (variable.value.trim().length === 0) continue;
    if (variable.name === "ANTHROPIC_SMALL_FAST_MODEL") {
      // Only fall back to the legacy alias when no explicit haiku pin exists.
      if (!sawSmallFast) roles.haiku ??= variable.value;
      sawSmallFast = true;
      continue;
    }
    for (const key of CLAUDE_ROLE_KEYS) {
      if (ROLE_VARIABLE_NAMES[key] === variable.name) {
        roles[key] = variable.value;
      }
    }
  }
  return roles;
}

/**
 * Write role pins back into an instance environment. Empty-string values
 * delete their variables; untouched roles keep whatever is stored —
 * including redacted secrets the browser cannot read.
 */
export function buildClaudeRoleEnvironment(
  environment: ProviderInstanceEnvironment,
  roles: Partial<ClaudeRoleModels>,
): ProviderInstanceEnvironment {
  const managed = new Set(CLAUDE_ROLE_ENVIRONMENT_VARIABLE_NAMES);
  const result: ProviderInstanceEnvironmentVariable[] = environment
    .filter((variable) => !managed.has(variable.name))
    .map((variable) => ({ ...variable }));
  const storedByName = new Map(environment.map((variable) => [variable.name, variable]));

  // - Fresh non-empty value → write plaintext over whatever was stored.
  // - Empty string → delete the pin.
  // - Untouched role → re-append the stored entry as-is so redacted secrets
  //   survive a round-trip through the browser.
  const writeRole = (name: string, value: string | undefined): void => {
    if (value !== undefined) {
      if (value.trim().length > 0) {
        result.push({ name, value, sensitive: false });
      }
      return;
    }
    const existing = storedByName.get(name);
    if (existing) {
      result.push({ ...existing });
    }
  };

  for (const key of CLAUDE_ROLE_KEYS) {
    const value = roles[key];
    writeRole(ROLE_VARIABLE_NAMES[key], value);
    if (key === "haiku") {
      // Mirror the pin onto the legacy alias so both generations of the CLI agree.
      writeRole("ANTHROPIC_SMALL_FAST_MODEL", value);
    }
  }
  return result;
}
