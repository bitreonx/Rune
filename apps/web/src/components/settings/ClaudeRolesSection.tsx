"use client";

import type { ProviderInstanceEnvironment } from "@rune/contracts";

import {
  buildClaudeRoleEnvironment,
  CLAUDE_ROLE_KEYS,
  readClaudeRoleModels,
  type ClaudeRoleKey,
} from "../../claudeRoles";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";

const ROLE_LABELS: Readonly<Record<ClaudeRoleKey, string>> = {
  opus: "Opus role",
  sonnet: "Sonnet role",
  haiku: "Haiku role",
};

/**
 * Pin gateway models to Claude's role slots. Pins become
 * `ANTHROPIC_DEFAULT_*_MODEL` environment variables on the instance, which
 * route subagent and background-task traffic to the chosen model. Variables
 * edited by hand in the advanced table always win over these pins — this
 * section simply reads and rewrites its own four names.
 */
export function ClaudeRolesSection(props: {
  readonly environment: ProviderInstanceEnvironment;
  readonly onChange: (environment: ProviderInstanceEnvironment) => void;
  readonly modelOptions: ReadonlyArray<string>;
}) {
  const roles = readClaudeRoleModels(props.environment);

  const setRole = (key: ClaudeRoleKey, value: string) => {
    props.onChange(buildClaudeRoleEnvironment(props.environment, { [key]: value }));
  };

  // The select must always be able to display the stored pin, even when it
  // is absent from the instance's current model list (e.g. removed upstream).
  const optionsFor = (key: ClaudeRoleKey): ReadonlyArray<string> => {
    const pinned = roles[key];
    return pinned !== undefined && !props.modelOptions.includes(pinned)
      ? [...props.modelOptions, pinned]
      : props.modelOptions;
  };

  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">
        Roles decide which models handle subagents and background tasks. Leave unpinned to use the
        service defaults; variables set by hand below win over these pins.
      </p>
      {CLAUDE_ROLE_KEYS.map((key) => (
        <div key={key} className="grid gap-1.5">
          <label htmlFor={`claude-role-${key}`} className="text-xs font-medium text-foreground">
            {ROLE_LABELS[key]}
          </label>
          <Select
            value={roles[key] ?? ""}
            onValueChange={(value) => setRole(key, value ?? "")}
          >
            <SelectTrigger id={`claude-role-${key}`} size="compact" aria-label={ROLE_LABELS[key]}>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value="">Not pinned</SelectItem>
              {optionsFor(key).map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
      ))}
    </div>
  );
}
