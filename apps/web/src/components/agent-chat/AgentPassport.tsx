import type { RuntimeSubagent } from "@rune/client-runtime/state/subagentRuntime";
import { Fingerprint } from "lucide-react";

import { buildAgentPassport } from "./agentDock.logic";

export function AgentPassport({ agent }: { agent: RuntimeSubagent }) {
  const fields = buildAgentPassport(agent);
  return (
    <details className="border-b border-border/45" data-rune-agent-passport>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">
        <Fingerprint aria-hidden className="size-3 text-[var(--rune-violet-strong)]" />
        Agent Passport
      </summary>
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1.5 px-3 pb-3 text-[10px]">
        {fields.map((field) => (
          <div key={field.label} className="contents">
            <dt className="text-muted-foreground/70">{field.label}</dt>
            <dd className="min-w-0 truncate font-mono text-foreground/85" title={field.value}>
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
