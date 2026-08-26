import { Code2, FileCode2, MousePointer2, TerminalSquare, X } from "lucide-react";
import { cn } from "~/lib/utils";

export type ComposerContextTrayContextKind = "terminal" | "file" | "element" | "review";

export interface ComposerContextTrayContext {
  readonly id: string;
  readonly kind: ComposerContextTrayContextKind;
  readonly label: string;
  readonly scope?: string | undefined;
}

export interface ComposerContextTrayProps {
  readonly contexts: ReadonlyArray<ComposerContextTrayContext>;
  readonly onRemoveContext: (contextId: string) => void;
  readonly className?: string;
}

function ContextIcon({ kind }: { kind: ComposerContextTrayContextKind }) {
  switch (kind) {
    case "terminal":
      return <TerminalSquare className="size-3.5" aria-hidden />;
    case "file":
      return <FileCode2 className="size-3.5" aria-hidden />;
    case "element":
      return <MousePointer2 className="size-3.5" aria-hidden />;
    case "review":
      return <Code2 className="size-3.5" aria-hidden />;
  }
}

export function ComposerContextTray({
  contexts,
  onRemoveContext,
  className,
}: ComposerContextTrayProps) {
  if (contexts.length === 0) return null;

  return (
    <div
      className={cn(
        "rune-composer-context-tray flex min-w-0 flex-wrap items-center gap-1.5 border-t border-border/45 px-3 py-2 sm:px-4",
        className,
      )}
      data-composer-context-tray
    >
      {contexts.map((context) => (
        <span
          key={context.id}
          className="group/context inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-border/65 bg-background/55 py-1 ps-2 pe-1 text-[11px] text-secondary-label shadow-xs"
          data-composer-context-kind={context.kind}
        >
          <ContextIcon kind={context.kind} />
          <span className="truncate font-medium text-foreground/85">{context.label}</span>
          {context.scope ? (
            <span className="max-w-40 truncate text-[10px] text-muted-foreground">
              {context.scope}
            </span>
          ) : null}
          <button
            type="button"
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={`Remove ${context.label}`}
            onClick={() => onRemoveContext(context.id)}
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}
