import type { ReactNode } from "react";

import type { PluginWorkspaceEntry } from "../../plugins/pluginsWorkspace.logic";
import { PluginCard } from "./PluginCard";

export function PluginsPageSection({
  title,
  icon,
  entries,
}: {
  readonly title: string;
  readonly icon: ReactNode;
  readonly entries: ReadonlyArray<PluginWorkspaceEntry>;
}) {
  if (entries.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border/70 bg-card/20 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">{icon}{title}</div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Nothing is reported in this scope.</p>
      </section>
    );
  }
  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex items-center gap-2 px-1 text-sm font-semibold text-foreground">{icon}{title}<span className="text-xs font-normal text-muted-foreground">{entries.length}</span></div>
      <div className="space-y-2">{entries.map((entry) => <PluginCard key={entry.key} entry={entry} />)}</div>
    </section>
  );
}

