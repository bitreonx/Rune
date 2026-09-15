import { Activity } from "lucide-react";

import type { RuntimeSubagent } from "@rune/client-runtime/state/subagentRuntime";

import { deriveAgentActivityStory } from "./agentDock.logic";

export function AgentActivityStory({ agent }: { agent: RuntimeSubagent }) {
  const story = deriveAgentActivityStory(agent);
  if (story.length === 0 && agent.recentActivity.length === 0) return null;

  return (
    <section className="mt-3 border-t border-border/50 pt-2.5" data-rune-agent-activity-story>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
        <Activity className="size-3 text-[var(--rune-violet-strong)]" aria-hidden />
        <span>Activity</span>
        <span className="font-normal text-muted-foreground/60">· semantic progress</span>
      </div>
      <div className="mt-1.5 space-y-1 rounded-md border border-border/50 bg-card/35 px-2.5 py-2">
        {story.map((entry, index) => (
          <div
            key={`${entry.at ?? "entry"}-${index}`}
            className="flex min-w-0 items-start gap-2 text-[11px] leading-relaxed text-foreground/85"
          >
            <span
              className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--rune-violet-strong)]"
              aria-hidden
            />
            <span className="min-w-0 flex-1">{entry.text}</span>
          </div>
        ))}
      </div>
      <details className="mt-1.5 text-[10px] text-muted-foreground/75">
        <summary className="cursor-pointer select-none px-1 py-1 hover:text-foreground">
          Technical trace · {agent.recentActivity.length} events
        </summary>
        <div className="space-y-1 border-l border-border/50 pl-2 font-mono text-[10px]">
          {agent.recentActivity.map((activity, index) => (
            <div key={`${activity.at}-${index}`} className="break-words">
              {activity.summary}
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
