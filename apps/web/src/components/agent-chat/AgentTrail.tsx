import type { RuntimeSubagent } from "@rune/client-runtime/state/subagentRuntime";
import { Cable, Check, FileCode2, FlaskConical, Search } from "lucide-react";

import { AGENT_TRAIL_SECTIONS, deriveAgentTrail, type AgentTrailSection } from "./agentDock.logic";

const SECTION_ICONS: Record<AgentTrailSection, typeof Search> = {
  Research: Search,
  Decision: Cable,
  Changes: FileCode2,
  Verification: FlaskConical,
  Result: Check,
};

export function AgentTrail({ agent }: { agent: RuntimeSubagent }) {
  const trail = deriveAgentTrail(agent);
  return (
    <details className="border-b border-border/45" data-rune-agent-trail>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">
        <Cable aria-hidden className="size-3 text-[var(--rune-violet-strong)]" />
        Agent Trail
      </summary>
      <div className="space-y-2 px-3 pb-3">
        {AGENT_TRAIL_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section];
          const entries = trail[section];
          return (
            <section key={section} className="rounded-md border border-border/45 bg-card/30 p-2">
              <h4 className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground/85">
                <Icon aria-hidden className="size-3 text-muted-foreground" />
                {section}
              </h4>
              {entries.length > 0 ? (
                <ul className="mt-1.5 space-y-1">
                  {entries.map((entry, index) => (
                    <li
                      key={`${entry.at ?? "entry"}-${index}`}
                      className="text-[10px] leading-relaxed text-muted-foreground"
                    >
                      {entry.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[10px] text-muted-foreground/55">
                  No durable evidence recorded yet.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </details>
  );
}
