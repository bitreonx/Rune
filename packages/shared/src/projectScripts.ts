import type { ProjectId, ProjectScript, ServerSettings } from "@rune/contracts";

type ProjectScriptSettings = Pick<
  ServerSettings,
  "defaultProjectScripts" | "projectScriptOverrides"
>;

interface ProjectScriptRuntimeEnvInput {
  project: {
    cwd: string;
  };
  worktreePath?: string | null;
  extraEnv?: Record<string, string>;
}

export function projectScriptCwd(input: {
  project: {
    cwd: string;
  };
  worktreePath?: string | null;
}): string {
  return input.worktreePath ?? input.project.cwd;
}

export function projectScriptRuntimeEnv(
  input: ProjectScriptRuntimeEnvInput,
): Record<string, string> {
  const env: Record<string, string> = {
    RUNE_PROJECT_ROOT: input.project.cwd,
  };
  if (input.worktreePath) {
    env.RUNE_WORKTREE_PATH = input.worktreePath;
  }
  if (input.extraEnv) {
    return { ...env, ...input.extraEnv };
  }
  return env;
}

export function setupProjectScript(scripts: readonly ProjectScript[]): ProjectScript | null {
  return scripts.find((script) => script.runOnWorktreeCreate) ?? null;
}

/** Resolves the effective actions while retaining legacy per-project scripts. */
export function resolveProjectScripts(
  settings: ProjectScriptSettings,
  project: { readonly id: ProjectId; readonly scripts: readonly ProjectScript[] },
): ReadonlyArray<ProjectScript> {
  const override = settings.projectScriptOverrides[project.id];
  if (override !== undefined) {
    return override ?? settings.defaultProjectScripts;
  }
  return project.scripts.length > 0 ? project.scripts : settings.defaultProjectScripts;
}

/** True when the project is using global defaults rather than a local override or legacy rows. */
export function projectScriptsInheritDefaults(
  settings: ProjectScriptSettings,
  project: { readonly id: ProjectId; readonly scripts: readonly ProjectScript[] },
): boolean {
  return settings.projectScriptOverrides[project.id] === undefined && project.scripts.length === 0;
}
