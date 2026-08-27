import { AlertCircle, Code2, Eye } from "lucide-react";
import { useState } from "react";
import type { ReactElement } from "react";

import { Toggle } from "~/components/ui/toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";

import { countJsonLeaves, formatJson, tryParseJson } from "./jsonFormat.ts";

export type JsonViewerProps = {
  readonly contents: string;
  readonly resolvedTheme: "light" | "dark";
};

type Mode = "tree" | "source";

/**
 * JSON viewer. Two modes:
 *  - tree: collapsible key/value list with primitive types colored
 *  - source: pretty-printed JSON in a monospace pre tag
 *
 * On parse failure the viewer falls back to source mode and shows an
 * inline error banner explaining what went wrong.
 */
export function JsonViewer({ contents, resolvedTheme: _resolvedTheme }: JsonViewerProps): ReactElement {
  const parseResult = tryParseJson(contents);
  const [mode, setMode] = useState<Mode>("tree");

  if (parseResult._tag === "Err") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className="flex h-9 min-h-9 shrink-0 items-center gap-2 border-b border-border/60 bg-background/60 px-2"
          data-json-viewer-toolbar
        >
          <span className="inline-flex items-center gap-1.5 rounded bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
            <AlertCircle className="size-3" />
            Could not parse JSON
          </span>
        </div>
        <div
          className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3"
          data-json-viewer-error
        >
          <p className="text-xs text-muted-foreground">{parseResult.message}</p>
          <pre className="overflow-auto rounded border border-border/40 bg-background/60 p-2 font-mono text-[11px] leading-relaxed">
            {contents}
          </pre>
        </div>
      </div>
    );
  }

  const leafCount = countJsonLeaves(parseResult.value);
  const prettySource = parseResult._tag === "Ok" && mode === "source" && isObjectOrArray(parseResult.value)
    ? formatJson(contents)
    : contents;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex h-9 min-h-9 shrink-0 items-center gap-1 border-b border-border/60 bg-background/60 px-2"
        data-json-viewer-toolbar
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                pressed={mode === "tree"}
                onPressedChange={(pressed) => setMode(pressed ? "tree" : "source")}
                aria-label={mode === "tree" ? "Show JSON source" : "Show JSON tree"}
                variant="ghost"
                size="sm"
              >
                {mode === "tree" ? <Eye className="size-3.5" /> : <Code2 className="size-3.5" />}
              </Toggle>
            }
          />
          <TooltipPopup>{mode === "tree" ? "Show JSON source" : "Show JSON tree"}</TooltipPopup>
        </Tooltip>
        <span
          className="ml-1 text-[11px] text-muted-foreground"
          data-json-leaf-count
        >
          {leafCount} {leafCount === 1 ? "entry" : "entries"}
        </span>
      </div>
      <div
        className="relative min-h-0 flex-1 overflow-auto p-3"
        data-json-viewer-stage
        data-json-mode={mode}
      >
        {mode === "tree" ? (
          <JsonTreeView value={parseResult.value} depth={0} keyName={null} />
        ) : (
          <pre
            className="overflow-auto font-mono text-[11px] leading-relaxed text-foreground"
            data-json-source
          >
            {prettySource}
          </pre>
        )}
      </div>
    </div>
  );
}

function isObjectOrArray(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function JsonTreeView({
  value,
  depth,
  keyName,
}: {
  readonly value: unknown;
  readonly depth: number;
  readonly keyName: string | null;
}): ReactElement {
  const [expanded, setExpanded] = useState(depth < 2);

  if (value === null) {
    return (
      <div className="font-mono text-[11px] leading-relaxed" data-json-row>
        <JsonKeyLabel keyName={keyName} />
        <span className="text-muted-foreground">null</span>
      </div>
    );
  }

  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") {
    return (
      <div className="font-mono text-[11px] leading-relaxed" data-json-row>
        <JsonKeyLabel keyName={keyName} />
        <span
          className={
            type === "string"
              ? "text-emerald-600 dark:text-emerald-400"
              : type === "number"
                ? "text-amber-600 dark:text-amber-400"
                : "text-sky-600 dark:text-sky-400"
          }
        >
          {type === "string" ? `"${value as string}"` : String(value)}
        </span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="font-mono text-[11px] leading-relaxed" data-json-row>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex items-center gap-1 rounded text-muted-foreground hover:text-foreground"
          data-json-toggle
        >
          <span className="size-3 text-center">{expanded ? "▾" : "▸"}</span>
          <JsonKeyLabel keyName={keyName} />
          <span>[{value.length}]</span>
        </button>
        {expanded ? (
          <div className="ml-4 border-l border-border/30 pl-2">
            {value.length === 0 ? (
              <span className="text-muted-foreground">empty</span>
            ) : (
              value.map((item, index) => (
                <JsonTreeView
                  key={index}
                  value={item}
                  depth={depth + 1}
                  keyName={String(index)}
                />
              ))
            )}
          </div>
        ) : null}
      </div>
    );
  }

  // Plain object.
  const entries = Object.entries(value as Record<string, unknown>);
  return (
    <div className="font-mono text-[11px] leading-relaxed" data-json-row>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="inline-flex items-center gap-1 rounded text-muted-foreground hover:text-foreground"
        data-json-toggle
      >
        <span className="size-3 text-center">{expanded ? "▾" : "▸"}</span>
        <JsonKeyLabel keyName={keyName} />
        <span>{`{${entries.length}}`}</span>
      </button>
      {expanded ? (
        <div className="ml-4 border-l border-border/30 pl-2">
          {entries.length === 0 ? (
            <span className="text-muted-foreground">empty</span>
          ) : (
            entries.map(([key, child]) => (
              <JsonTreeView key={key} value={child} depth={depth + 1} keyName={key} />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function JsonKeyLabel({ keyName }: { readonly keyName: string | null }): ReactElement | null {
  if (keyName === null) return null;
  return (
    <span className="mr-1.5 text-foreground/80">
      {keyName}
      <span className="text-muted-foreground">:</span>
    </span>
  );
}
