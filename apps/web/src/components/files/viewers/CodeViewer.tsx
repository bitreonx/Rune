import { WrapText } from "lucide-react";
import type { ReactElement } from "react";

import { Toggle } from "~/components/ui/toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";

import { detectLanguage } from "./detectLanguage.ts";

export type CodeViewerProps = {
  readonly contents: string;
  readonly relativePath: string;
  readonly wordWrap: boolean;
  readonly onToggleWordWrap: () => void;
};

/**
 * Read-only code viewer. Used for kinds the shell routes to "text"
 * but that the user doesn't want to edit in this surface (markdown
 * source, log files, etc.). The existing EditableFileSurface in
 * FilePreviewPanel handles the editable case; this is the simpler
 * sibling for read-mostly files.
 *
 * The viewer shows the language id in the toolbar (from
 * detectLanguage) and a word-wrap toggle that the parent owns.
 */
export function CodeViewer({
  contents,
  relativePath,
  wordWrap,
  onToggleWordWrap,
}: CodeViewerProps): ReactElement {
  const language = detectLanguage(relativePath);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex h-9 min-h-9 shrink-0 items-center gap-2 border-b border-border/60 bg-background/60 px-2"
        data-code-viewer-toolbar
      >
        <span
          className="ml-1 rounded bg-background/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground"
          data-code-language
        >
          {language}
        </span>
        <span
          className="ml-1 text-[11px] text-muted-foreground"
          data-code-line-count
        >
          {countLines(contents)} {countLines(contents) === 1 ? "line" : "lines"}
        </span>
        <div className="ml-auto">
          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle
                  pressed={wordWrap}
                  onPressedChange={() => onToggleWordWrap()}
                  aria-label={wordWrap ? "Disable word wrap" : "Enable word wrap"}
                  variant="ghost"
                  size="sm"
                >
                  <WrapText className="size-3.5" />
                </Toggle>
              }
            />
            <TooltipPopup>{wordWrap ? "Disable word wrap" : "Enable word wrap"}</TooltipPopup>
          </Tooltip>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3" data-code-stage>
        <pre
          className={
            wordWrap
              ? "whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground"
              : "whitespace-pre font-mono text-[11px] leading-relaxed text-foreground"
          }
          data-code-source
        >
          {contents}
        </pre>
      </div>
    </div>
  );
}

function countLines(contents: string): number {
  if (contents.length === 0) return 0;
  let count = 1;
  for (let index = 0; index < contents.length; index += 1) {
    const char = contents.charCodeAt(index);
    if (char === 10) count += 1;
    else if (char === 13) {
      count += 1;
      if (contents.charCodeAt(index + 1) === 10) index += 1;
    }
  }
  return count;
}
