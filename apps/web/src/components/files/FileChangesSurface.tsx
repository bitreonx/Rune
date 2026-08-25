import type { EnvironmentId } from "@t3tools/contracts";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import { LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { resolveDiffThemeName } from "~/lib/diffRendering";
import { projectEnvironment } from "~/state/projects";
import { useAtomQueryRunner } from "~/state/use-atom-query-runner";

import { StyledDiffCodeView } from "../diffs/StyledDiffCodeView";
import { buildFileChanges } from "./fileChangesItems";

interface FileChangesSurfaceProps {
  environmentId: EnvironmentId;
  cwd: string;
  relativePath: string;
  /** The working-copy contents the editor holds right now. */
  currentContents: string;
  resolvedTheme: "light" | "dark";
}

type HeadReadState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "ready";
      /** Null when the file is untracked or the repository has no commits. */
      readonly headContents: string | null;
    };

/**
 * What the open file looks like against its last commit: a unified diff of
 * HEAD versus the working copy, or an explanation when there is nothing to
 * compare against.
 */
export function FileChangesSurface({
  environmentId,
  cwd,
  relativePath,
  currentContents,
  resolvedTheme,
}: FileChangesSurfaceProps) {
  const readFileAtHead = useAtomQueryRunner(projectEnvironment.readFileAtHead, {
    reportFailure: false,
  });
  const [headState, setHeadState] = useState<HeadReadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setHeadState({ status: "loading" });
    readFileAtHead({ environmentId, input: { cwd, relativePath } }).then((result) => {
      if (cancelled) return;
      if (result._tag === "Success") {
        setHeadState({
          status: "ready",
          headContents: result.value.presentInHead ? result.value.contents : null,
        });
        return;
      }
      const error = isAtomCommandInterrupted(result) ? null : squashAtomCommandFailure(result);
      setHeadState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : `Could not read committed contents of ${relativePath}.`,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [cwd, environmentId, readFileAtHead, relativePath]);

  const changes = useMemo(
    () =>
      headState.status === "ready"
        ? buildFileChanges(relativePath, headState.headContents, currentContents)
        : null,
    [currentContents, headState, relativePath],
  );

  if (headState.status === "loading") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" />
      </div>
    );
  }

  if (headState.status === "error") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-xs leading-relaxed text-destructive">
        {headState.message}
      </div>
    );
  }

  if (changes === null) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-xs text-muted-foreground">
        Loading changes…
      </div>
    );
  }

  if (changes.unchanged) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-xs text-muted-foreground">
        No uncommitted changes.
      </div>
    );
  }

  return (
    <StyledDiffCodeView
      key={`${relativePath}:${resolvedTheme}`}
      className="min-h-0 flex-1 overflow-auto"
      items={changes.items}
      options={{
        diffStyle: "unified",
        disableFileHeader: true,
        lineDiffType: "none",
        overflow: "scroll",
        stickyHeaders: false,
        theme: resolveDiffThemeName(resolvedTheme),
        themeType: resolvedTheme,
      }}
    />
  );
}
