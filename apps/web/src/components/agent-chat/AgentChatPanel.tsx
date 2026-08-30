import { useAtomValue } from "@effect/atom-react";
import { RuntimeTaskId, type EnvironmentId, type ThreadId } from "@rune/contracts";
import {
  formatSubagentDisplayName,
  type RuntimeSubagent,
} from "@rune/client-runtime/state/subagentRuntime";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  CircleStop,
  Send,
  Wrench,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "~/lib/utils";
import { orchestrationEnvironment } from "~/state/orchestration";
import { useAtomCommand } from "~/state/use-atom-command";
import { useAtomQueryRunner } from "~/state/use-atom-query-runner";
import { squashAtomCommandFailure } from "@rune/client-runtime/state/runtime";
import ChatMarkdown from "~/components/ChatMarkdown";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Textarea } from "~/components/ui/textarea";
import { SubagentAvatar } from "./SubagentAvatar";
import { AgentPassport } from "./AgentPassport";
import { AgentArtifactBar } from "./AgentArtifactBar";
import {
  deriveAgentTrail,
  type AgentArtifactAvailability,
  type AgentArtifactSurface,
} from "./agentDock.logic";
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

function formatAgentElapsed(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return "";
  const start = Date.parse(startedAt);
  const end = completedAt ? Date.parse(completedAt) : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) return "";
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60
    ? `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`
    : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function AgentWorkingMeta({ agent }: { agent: RuntimeSubagent }) {
  const live =
    agent.status === "pending" || agent.status === "running" || agent.status === "waiting";
  const elapsedRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!live || !agent.startedAt) return;
    const update = () => {
      if (elapsedRef.current) {
        elapsedRef.current.textContent = formatAgentElapsed(agent.startedAt, null);
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [agent.startedAt, live]);

  const label = live
    ? agent.status === "waiting"
      ? "Waiting"
      : "Working"
    : agent.status === "completed"
      ? "Completed"
      : agent.status === "failed"
        ? "Failed"
        : "Stopped";
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <span>{label}</span>
      {agent.startedAt ? (
        <>
          <span aria-hidden>·</span>
          <span ref={elapsedRef} className="tabular-nums">
            {formatAgentElapsed(agent.startedAt, live ? null : agent.completedAt)}
          </span>
        </>
      ) : null}
      {agent.progress ? (
        <>
          <span aria-hidden>·</span>
          <span className="max-w-52 truncate text-foreground/65">{agent.progress}</span>
        </>
      ) : null}
    </div>
  );
}

function AgentVerificationArtifact({ agent }: { agent: RuntimeSubagent }) {
  const trail = deriveAgentTrail(agent);
  const entries = [...trail.Verification, ...trail.Result];
  return (
    <div className="space-y-3 px-3 py-3" data-rune-agent-verification>
      <div>
        <h4 className="text-xs font-semibold">Verification</h4>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Evidence retained from the child agent&apos;s runtime events.
        </p>
      </div>
      {entries.length > 0 ? (
        <ul className="space-y-1.5 rounded-md border border-border/55 bg-card/35 p-2.5">
          {entries.map((entry, index) => (
            <li key={`${entry.at ?? "entry"}-${index}`} className="text-xs leading-relaxed">
              {entry.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-xs text-muted-foreground">
          No verification evidence has been recorded yet.
        </p>
      )}
    </div>
  );
}

function AgentActivityStory({ agent }: { agent: RuntimeSubagent }) {
  const trail = deriveAgentTrail(agent);
  const story = [
    ...trail.Research,
    ...trail.Decision,
    ...trail.Changes,
    ...trail.Verification,
    ...trail.Result,
  ].slice(-6);
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
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--rune-violet-strong)]" aria-hidden />
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

export function AgentChatPanel({
  environmentId,
  threadId,
  agent,
  cwd,
  onBack,
  artifactAvailability,
  onOpenArtifactSurface,
}: {
  environmentId: EnvironmentId;
  threadId: ThreadId;
  agent: RuntimeSubagent;
  cwd?: string;
  onBack: () => void;
  artifactAvailability?: AgentArtifactAvailability;
  onOpenArtifactSurface?: (surface: AgentArtifactSurface) => void;
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
  const [verificationOpen, setVerificationOpen] = useState(false);

  const displayName = formatSubagentDisplayName(agent);

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

  const statusDotClass =
    agent.status === "running" || agent.status === "pending"
      ? "bg-info shadow-[0_0_0_3px_color-mix(in_srgb,var(--info)_18%,transparent)]"
      : agent.status === "failed"
        ? "bg-destructive"
        : agent.status === "completed"
          ? "bg-success"
          : "bg-muted-foreground/60";

  return (
    <section
      className="flex min-h-0 flex-1 flex-col border-b border-border/60 bg-background"
      data-rune-agent-surface
      data-rune-agent-chat
      aria-label={`${displayName} chat`}
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
        <SubagentAvatar
          iconName={agent.iconName}
          iconColor={agent.iconColor}
          className="size-7"
          iconClassName="size-3.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-xs font-semibold">{displayName}</h3>
            <span className={cn("size-1.5 shrink-0 rounded-full", statusDotClass)} aria-hidden />
          </div>
          <p className="truncate text-[10px] text-muted-foreground">
            {agent.agentPath ?? agent.role ?? agent.title}
          </p>
          <AgentWorkingMeta agent={agent} />
        </div>
        {(agent.status === "running" || agent.status === "waiting") && interruptSupported ? (
          <Button
            size="icon-micro"
            variant="ghost-muted"
            onClick={interrupt}
            aria-label="Stop agent"
          >
            <CircleStop aria-hidden />
          </Button>
        ) : null}
      </header>

      <AgentArtifactBar
        verificationActive={verificationOpen}
        {...(artifactAvailability ? { availability: artifactAvailability } : {})}
        {...(onOpenArtifactSurface ? { onOpenSurface: onOpenArtifactSurface } : {})}
        onOpenVerification={() => setVerificationOpen((current) => !current)}
      />

      <ScrollArea className="min-h-0 flex-1">
        {verificationOpen ? (
          <AgentVerificationArtifact agent={agent} />
        ) : (
          <div className="space-y-3 px-3 py-3" data-rune-agent-chat-transcript>
            {/* Initial agent mission banner / prompt context if provided */}
            <div className="rounded-lg border border-border/60 bg-accent/25 p-2.5 text-xs">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-muted-foreground">
                <Wrench className="size-3 text-[var(--rune-violet-strong)]" />
                <span>Assigned Mission:</span>
              </div>
              <p className="font-mono text-[11px] text-foreground/90">{agent.title}</p>
              {agent.role ? (
                <p className="mt-1 text-[10px] text-muted-foreground">Role: {agent.role}</p>
              ) : null}
            </div>

            <AgentPassport agent={agent} />
            <AgentActivityStory agent={agent} />

            {!readSupported ? (
              <div className="border border-dashed border-border/70 px-3 py-3 text-xs text-muted-foreground">
                This agent reports live activity below. Follow-up messaging is not supported for
                this provider.
              </div>
            ) : result._tag === "Failure" ? (
              <div className="border border-dashed border-destructive/45 px-3 py-3 text-xs text-destructive-foreground">
                Unable to load this child chat transcript. Select it again to retry.
              </div>
            ) : result._tag !== "Success" ? (
              <p className="text-xs text-muted-foreground">Loading child chat…</p>
            ) : visibleMessages.length === 0 ? (
              <div className="border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                This agent is ready. Send a message below to direct it.
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
                  <div className="mb-1 flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                    {message.role === "user" ? (
                      "You"
                    ) : (
                      <>
                        <SubagentAvatar
                          iconName={agent.iconName}
                          iconColor={agent.iconColor}
                          className="size-3.5 rounded-xs"
                          iconClassName="size-2"
                        />
                        <span>{displayName}</span>
                      </>
                    )}
                  </div>
                  {message.role === "assistant" ? (
                    <div
                      className={cn(
                        "rounded-md border border-border/40 bg-card/60 px-3 py-2",
                        message.streaming && "border-info/45 bg-info/5",
                      )}
                    >
                      <ChatMarkdown text={message.text} cwd={cwd} lineBreaks />
                      {message.streaming ? (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-info-foreground">
                          <span className="size-1.5 rounded-full bg-info" aria-hidden />
                          Streaming
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap rounded-md bg-accent/55 px-2.5 py-2 text-foreground/90">
                      {message.text}
                    </p>
                  )}
                </article>
              ))
            )}

            {/* Agent status summary if finished or error */}
            {agent.status === "completed" && agent.result ? (
              <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-2.5 py-2 text-xs text-success">
                <CheckCircle2 className="size-4 shrink-0" />
                <span className="truncate">{agent.result}</span>
              </div>
            ) : agent.status === "failed" && agent.error ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
                <XCircle className="size-4 shrink-0" />
                <span className="truncate">{agent.error}</span>
              </div>
            ) : null}

            {error ? (
              <p className="border border-destructive/45 px-2.5 py-2 text-xs text-destructive-foreground">
                {error}
              </p>
            ) : null}
          </div>
        )}
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
            placeholder={sendSupported ? `Message ${displayName}…` : "Agent chat unavailable"}
            disabled={!sendSupported || sending}
            unstyled
            className="min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-xs shadow-none outline-none"
            aria-label={`Message ${displayName}`}
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
