import {
  RUNE_PROJECT_FILE_NAME,
  type EnvironmentId,
  type RuneProjectFile,
  type RuneProjectFileScript,
} from "@rune/contracts";
import { parseRuneProjectFile } from "@rune/shared/runeProjectFile";
import { useMemo } from "react";

import { useProjectFileQuery } from "~/components/files/projectFilesQueryState";

const NO_SCRIPTS: ReadonlyArray<RuneProjectFileScript> = [];

export interface RuneProjectFileState {
  status: "loading" | "missing" | "invalid" | "valid";
  file: RuneProjectFile | null;
  scripts: ReadonlyArray<RuneProjectFileScript>;
}

/** Read the checked-in `rune.json` for the active project. */
export function useRuneProjectFileState(
  environmentId: EnvironmentId,
  cwd: string | null,
): RuneProjectFileState {
  const query = useProjectFileQuery(environmentId, cwd ?? "", RUNE_PROJECT_FILE_NAME, cwd !== null);
  const contents = query.data && !query.data.truncated ? query.data.contents : null;
  const isPending = query.isPending;
  return useMemo(() => {
    if (contents === null) {
      return {
        status: isPending ? "loading" : "missing",
        file: null,
        scripts: NO_SCRIPTS,
      } as const;
    }
    const file = parseRuneProjectFile(contents);
    if (file === null) {
      return { status: "invalid", file: null, scripts: NO_SCRIPTS } as const;
    }
    return { status: "valid", file, scripts: file.scripts ?? NO_SCRIPTS } as const;
  }, [contents, isPending]);
}

/** Scripts declared by `rune.json`, offered for import in the scripts menu. */
export function useRuneProjectFileScripts(
  environmentId: EnvironmentId,
  cwd: string | null,
): ReadonlyArray<RuneProjectFileScript> {
  return useRuneProjectFileState(environmentId, cwd).scripts;
}
