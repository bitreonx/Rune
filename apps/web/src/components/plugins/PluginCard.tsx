import { CheckCircle2Icon, PuzzleIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import type { PluginWorkspaceEntry } from "../../plugins/pluginsWorkspace.logic";
import { resolvePluginActionState } from "../../plugins/pluginsWorkspace.logic";

export function PluginCard({ entry }: { readonly entry: PluginWorkspaceEntry }) {
  const actionState = resolvePluginActionState(entry);
  return (
    <article className="rounded-2xl border border-border/60 bg-card/35 p-4 transition-[background-color,border-color,transform] duration-200 ease-out hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--rune-violet-soft)_35%,var(--border))] hover:bg-card/65" data-rune-plugin-entry={entry.key}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[color-mix(in_srgb,var(--rune-violet-soft)_35%,var(--border))] bg-[var(--rune-violet-soft)]/15 text-[var(--rune-violet-strong)]"><PuzzleIcon className="size-4" aria-hidden /></span>
          <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-foreground">{entry.name}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{entry.providerDisplayName}</p></div>
        </div>
        <Badge variant={entry.state === "enabled" ? "success" : "outline"} size="sm">{entry.state === "enabled" ? "Enabled" : "Disabled"}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5"><Badge variant="outline" size="sm" className="capitalize">{entry.scope === "project" ? "This project" : "All projects"}</Badge>{entry.capabilities.map((capability) => <Badge key={capability} variant="outline" size="sm">{capability}</Badge>)}</div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">{entry.skillNames.length}</span> skill{entry.skillNames.length === 1 ? "" : "s"} exposed through the provider catalog.</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/50 pt-3 text-[11px] text-muted-foreground"><span className="truncate">{entry.safePath}</span><span className={cn("flex shrink-0 items-center gap-1 font-medium", actionState === "ready" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>{actionState === "ready" ? <CheckCircle2Icon className="size-3" /> : null}{actionState === "ready" ? "Provider-managed" : "Awaiting provider"}</span></div>
    </article>
  );
}

