import { useAtomValue } from "@effect/atom-react";
import { RuntimeTaskId, type EnvironmentId, type ThreadId } from "@t3tools/contracts";
import type { RuntimeSubagent } from "@t3tools/client-runtime/state/subagentRuntime";
import { ArrowLeft, Bot, CircleStop, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "~/lib/utils";
import { orchestrationEnvironment } from "~/state/orchestration";
import { useAtomCommand } from "~/state/use-atom-command";
import { useAtomQueryRunner } from "~/state/use-atom-query-runner";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import ChatMarkdown from "~/components/ChatMarkdown";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Textarea } from "~/components/ui/textarea";
import {
  agentChatErrorMessage,
  canInterruptAgentChat,
  canReadAgentChat,
  canSendAgentChat,
  mergeAgentChatMessages,
  optimisticAgentMessage,
  type AgentChatMessage,
} from "./agentChatLogic";

function agentChatInput(environmentId: EnvironmentId, threadId: ThreadId, agentId: RuntimeTaskId) {
  return { environmentId, input: { threadId, agentId } };
}

export function AgentChatPanel({
  environmentId,
  threadId,
  agent,
  cwd,
  onBack,
}: {
  environmentId: EnvironmentId;
  threadId: ThreadId;
  agent: RuntimeSubagent;
  cwd?: string;
  onBack: () => void;
}) {
  const runtimeAgentId = RuntimeTaskId.make(agent.id);
  const input = useMemo(
    () => agentChatInput(environmentId, threadId, runtimeAgentId),
    [environmentId, runtimeAgentId, threadId],
  );
  const result = useAtomValue(orchestrationEnvironment.agentChat(input));
  const refreshChat = useAtomQueryRunner(orchestrationEnvironment.agentChat, {
    reportFailure: false,
  });
  const sendMessage = useAtomCommand(orchestrationEnvironment.sendAgentMessage, {
    reportFailure: false,
  });
  const interruptMessage = useAtomCommand(orchestrationEnvironment.interruptAgentMessage, {
    reportFailure: false,
  });
  const [draft, setDraft] = useState("");
  const [optimistic, setOptimistic] = useState<ReadonlyArray<AgentChatMessage>>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void refreshChat(input);
  }, [input, refreshChat]);

  useEffect(() => {
    refresh();
  }, [agent.updatedAt, refresh]);

  const messages = result._tag === "Success" ? result.value.messages : [];
  useEffect(() => {
    if (result._tag !== "Success") return;
    setOptimistic((current) =>
      current.filter(
        (pending) =>
          !result.value.messages.some(
            (message) => message.role === "user" && message.text === pending.text,
          ),
      ),
    );
  }, [result]);

  const visibleMessages = mergeAgentChatMessages(messages, optimistic);
  const readSupported = canReadAgentChat(agent);
  const sendSupported = canSendAgentChat(agent);
  const interruptSupported = canInterruptAgentChat(agent);

  const submit = async () => {
    const text = draft.trim();
    if (!text || sending || !sendSupported) return;
    setError(null);
    setSending(true);
    setOptimistic((current) => [
      ...current,
      optimisticAgentMessage(`optimistic-${Date.now()}`, text),
    ]);
    setDraft("");
    const commandResult = await sendMessage({
      environmentId,
      input: { threadId, agentId: runtimeAgentId, input: text },
    });
    if (commandResult._tag === "Failure") {
      setDraft(text);
      setOptimistic((current) => current.filter((message) => message.text !== text));
      setError(
        agentChatErrorMessage(
          squashAtomCommandFailure(commandResult),
          "Unable to send the child-agent message.",
        ),
      );
    } else {
      refresh();
    }
    setSending(false);
  };

  const interrupt = async () => {
    if (!interruptSupported) return;
    const commandResult = await interruptMessage({
      environmentId,
      input: { threadId, agentId: runtimeAgentId },
    });
    if (commandResult._tag === "Failure") {
      setError(
        agentChatErrorMessage(
          squashAtomCommandFailure(commandResult),
          "Unable to interrupt the child-agent turn.",
        ),
      );
    } else {
      refresh();
    }
  };

  return (
    <section
      className="flex min-h-0 flex-1 flex-col border-b border-border/60 bg-background"
      data-rune-agent-surface
      data-rune-agent-chat
      aria-label={`${agent.title} chat`}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <Button
          size="icon-micro"
          variant="ghost-muted"
          onClick={onBack}
          aria-label="Back to agents"
          title="Back to agents"
        >
          <ArrowLeft aria-hidden />
        </Button>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--rune-violet-strong)_38%,var(--border))] bg-[color-mix(in_srgb,var(--rune-violet-soft)_14%,transparent)] text-[var(--rune-violet-strong)]">
          <Bot aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-xs font-semibold">{agent.title}</h3>
            <span className="size-1.5 shrink-0 rounded-full bg-info" aria-hidden />
          </div>
          <p className="truncate text-[10px] text-muted-foreground">
            {agent.agentPath ?? agent.role ?? "Child agent"}
          </p>
        </div>
        {(agent.status === "running" || agent.status === "waiting") && interruptSupported ? (
          <Button size="icon-micro" variant="ghost-muted" onClick={interrupt} aria-label="Stop agent">
            <CircleStop aria-hidden />
          </Button>
        ) : null}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 px-3 py-3" data-rune-agent-chat-transcript>
          {!readSupported ? (
            <div className="border border-dashed border-border/70 px-3 py-3 text-xs text-muted-foreground">
              This agent can report activity but cannot be continued here.
            </div>
          ) : result._tag === "Failure" ? (
            <div className="border border-dashed border-destructive/45 px-3 py-3 text-xs text-destructive-foreground">
              Unable to load this child chat. Select it again to retry.
            </div>
          ) : result._tag !== "Success" ? (
            <p className="text-xs text-muted-foreground">Loading child chat…</p>
          ) : visibleMessages.length === 0 ? (
            <div className="border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
              This agent is ready for a follow-up.
            </div>
          ) : (
            visibleMessages.map((message) => (
              <article
                key={message.id}
                className={cn(
                  "max-w-[92%] text-xs leading-relaxed",
                  message.role === "user" ? "ml-auto" : "mr-auto",
                )}
              >
                <div className="mb-1 text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                  {message.role === "user" ? "You" : agent.title}
                </div>
                {message.role === "assistant" ? (
                  <ChatMarkdown text={message.text} cwd={cwd} lineBreaks />
                ) : (
                  <p className="whitespace-pre-wrap rounded-md bg-accent/45 px-2.5 py-2 text-foreground/90">
                    {message.text}
                  </p>
                )}
              </article>
            ))
          )}
          {error ? (
            <p className="border border-destructive/45 px-2.5 py-2 text-xs text-destructive-foreground">
              {error}
            </p>
          ) : null}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border/60 p-2.5">
        <div className="flex items-end gap-2 border border-border/70 bg-card/45 p-1.5 focus-within:border-[var(--rune-violet-strong)]">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder={sendSupported ? "Message this agent…" : "Agent chat unavailable"}
            disabled={!sendSupported || sending}
            unstyled
            className="min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-xs shadow-none outline-none"
            aria-label={`Message ${agent.title}`}
          />
          <Button
            size="icon-sm"
            variant="default"
            onClick={() => void submit()}
            disabled={!sendSupported || sending || draft.trim().length === 0}
            aria-label="Send message to agent"
          >
            <Send aria-hidden />
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-[9px] text-muted-foreground/70">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </section>
  );
}
