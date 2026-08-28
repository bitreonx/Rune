import type { EnvironmentId, ScopedThreadRef } from "@rune/contracts";
import { Braces } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { useTheme } from "~/hooks/useTheme";
import { resolveDiffThemeName } from "~/lib/diffRendering";

export interface JsonViewerProps {
  readonly relativePath: string;
  readonly contents: string;
  readonly byteLength: number;
}

function formatJson(contents: string): string {
  try {
    return JSON.stringify(JSON.parse(contents), null, 2);
  } catch {
    return contents;
  }
}

/**
 * Read-only structured view: formatted JSON with copy support. JSON is
 * usually machine-written, so no editing surface here — the source editor
 * stays available through the viewer's source mode.
 */
export function JsonViewer(props: JsonViewerProps) {
  const { resolvedTheme } = useTheme();
  const [formatted, setFormatted] = useState(true);
  const [copied, setCopied] = useState(false);

  const display = useMemo(
    () => (formatted ? formatJson(props.contents) : props.contents),
    [formatted, props.contents],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Braces className="size-3.5" />
          JSON
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-[11px]"
                aria-pressed={formatted}
                onClick={() => setFormatted((value) => !value)}
              />
            }
          >
            {formatted ? "Raw" : "Format"}
          </TooltipTrigger>
          <TooltipPopup>{formatted ? "Show raw contents" : "Format JSON"}</TooltipPopup>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="text-[11px]"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(display)
                    .then(() => setCopied(true))
                    .finally(() => setTimeout(() => setCopied(false), 1200));
                }}
              />
            }
          >
            {copied ? "Copied" : "Copy"}
          </TooltipTrigger>
          <TooltipPopup>Copy displayed JSON</TooltipPopup>
        </Tooltip>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {props.byteLength.toLocaleString()} bytes
        </span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <pre
          className="px-4 py-3 text-xs leading-relaxed"
          data-json-viewer
          data-theme={resolveDiffThemeName(resolvedTheme)}
        >
          {display}
        </pre>
      </ScrollArea>
    </div>
  );
}
