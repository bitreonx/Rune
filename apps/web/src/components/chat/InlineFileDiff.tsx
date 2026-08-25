import { type EnvironmentId, type ThreadId } from "@t3tools/contracts";
import { useMemo } from "react";

import {
  buildFileDiffRenderKey,
  findFileDiffByPath,
  fnv1a32,
  getRenderablePatch,
  resolveDiffThemeName,
} from "../../lib/diffRendering";
import { useCheckpointDiff } from "../../state/queries";
import { StyledDiffCodeView } from "../diffs/StyledDiffCodeView";

interface InlineFileDiffProps {
  environmentId: EnvironmentId;
  threadId: ThreadId;
  /** Checkpoint turn the diff leads up to; the query diffs the transition into it. */
  checkpointTurnCount: number;
  /** Files to show, or null for every file in the turn. */
  filePaths: ReadonlyArray<string> | null;
  resolvedTheme: "light" | "dark";
  /** Present when the row offers the side diff panel as the full view. */
  onOpenFullDiff?: () => void;
}

/**
 * The turn diff rendered in place under a chat row. Shares the diff panel's
 * query cache — expanding here never refetches what the panel already loaded.
 */
export function InlineFileDiff({
  environmentId,
  threadId,
  checkpointTurnCount,
  filePaths,
  resolvedTheme,
  onOpenFullDiff,
}: InlineFileDiffProps) {
  const { data, error, isPending } = useCheckpointDiff({
    environmentId,
    threadId,
    fromTurnCount: Math.max(0, checkpointTurnCount - 1),
    toTurnCount: checkpointTurnCount,
    ignoreWhitespace: true,
  });

  const files = useMemo(() => {
    const renderable = getRenderablePatch(data?.diff, `inline:${resolvedTheme}`);
    if (!renderable || renderable.kind !== "files") return [];
    if (filePaths === null) return renderable.files;
    return filePaths.flatMap((filePath) => {
      const file = findFileDiffByPath(renderable.files, filePath);
      return file ? [file] : [];
    });
  }, [data?.diff, filePaths, resolvedTheme]);

  const items = useMemo(
    () =>
      files.map((fileDiff) => {
        const fileKey = buildFileDiffRenderKey(fileDiff);
        return {
          id: fileKey,
          type: "diff" as const,
          fileDiff,
          collapsed: false,
          version: fnv1a32(fileKey),
        };
      }),
    [files],
  );

  if (error) {
    return <InlineFileDiffNotice label={error} onOpenFullDiff={onOpenFullDiff} />;
  }
  if (items.length === 0) {
    return isPending ? (
      <p className="px-0.5 py-1 text-xs text-muted-foreground/70">Loading diff…</p>
    ) : (
      <InlineFileDiffNotice label="No textual changes recorded." onOpenFullDiff={onOpenFullDiff} />
    );
  }

  return (
    <div className="my-1 overflow-hidden rounded-lg border border-border/60 bg-background">
      <StyledDiffCodeView
        className="max-h-72 overflow-auto"
        items={items}
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
      {onOpenFullDiff ? (
        <button
          type="button"
          className="w-full border-t border-border/60 px-2 py-1.5 text-left text-xs text-muted-foreground/80 transition-colors hover:bg-accent/40 hover:text-foreground"
          onClick={onOpenFullDiff}
        >
          Open full diff
        </button>
      ) : null}
    </div>
  );
}

function InlineFileDiffNotice({
  label,
  onOpenFullDiff,
}: {
  label: string;
  onOpenFullDiff?: (() => void) | undefined;
}) {
  return (
    <div className="my-1 flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground/70">{label}</p>
      {onOpenFullDiff ? (
        <button
          type="button"
          className="shrink-0 text-xs text-muted-foreground/80 underline-offset-2 hover:text-foreground hover:underline"
          onClick={onOpenFullDiff}
        >
          Open full diff
        </button>
      ) : null}
    </div>
  );
}
