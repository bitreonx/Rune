import { RUNE_PROJECT_FILE_NAME, type EnvironmentId, type ThreadEnvMode } from "@rune/contracts";
import { parseRuneProjectFile } from "@rune/shared/runeProjectFile";
import { executeAtomQuery } from "@rune/client-runtime/state/runtime";

import {
  getProjectFileQueryAtom,
  resolveProjectFileQueryData,
} from "~/components/files/projectFilesQueryState";
import { appAtomRegistry } from "~/rpc/atomRegistry";

/** Read the new-thread default from the project's checked-in `rune.json`. */
export async function readRuneProjectFileDefaultThreadEnvMode(
  environmentId: EnvironmentId,
  workspaceRoot: string,
): Promise<ThreadEnvMode | null> {
  const result = await executeAtomQuery(
    appAtomRegistry,
    getProjectFileQueryAtom(environmentId, workspaceRoot, RUNE_PROJECT_FILE_NAME),
    { reportDefect: false, reportFailure: false },
  );
  const data = resolveProjectFileQueryData(
    environmentId,
    workspaceRoot,
    RUNE_PROJECT_FILE_NAME,
    result._tag === "Success" ? result.value : null,
  );
  if (data === null || data.truncated) return null;
  return parseRuneProjectFile(data.contents)?.defaultThreadEnvMode ?? null;
}
