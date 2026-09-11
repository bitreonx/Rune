import { useAtomValue } from "@effect/atom-react";
import {
  EnvironmentId,
  IanaTimezone,
  PositiveInt,
  ScheduleDateTime,
  ScheduleId,
  ThreadId,
  TrimmedNonEmptyString,
  type RuneSchedule,
  type ScheduleCreateInput,
  type ScheduleStatus,
} from "@rune/contracts";
import { AsyncResult } from "effect/unstable/reactivity";
import {
  CalendarClockIcon,
  Clock3Icon,
  LoaderCircleIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RotateCcwIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { useEnvironmentQuery } from "../../state/query";
import { useEnvironments, usePrimaryEnvironmentId } from "../../state/environments";
import { schedulesEnvironment } from "../../state/schedules";
import { useAtomCommand } from "../../state/use-atom-command";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  formatScheduleNextRun,
  formatScheduleStatus,
  formatScheduleTrigger,
  localDateTimeToIso,
} from "./schedules.logic";

const DEFAULT_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
type TriggerType = "once" | "interval";
type LifecycleAction = "pause" | "resume" | "run-now" | "delete";

function makeIdempotencyKey(operation: string, scheduleId?: string): string {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `schedule-${operation}:${scheduleId ?? "new"}:${suffix}`;
}

function statusVariant(status: ScheduleStatus): "success" | "warning" | "error" | "secondary" {
  if (status === "active") return "success";
  if (status === "paused") return "warning";
  if (status === "failed") return "error";
  return "secondary";
}

function EnvironmentPicker({
  environments,
  value,
  onChange,
}: {
  readonly environments: ReadonlyArray<{ environmentId: EnvironmentId; label: string }>;
  readonly value: EnvironmentId | null;
  readonly onChange: (value: EnvironmentId) => void;
}) {
  return (
    <label className="flex min-w-52 items-center gap-2 rounded-xl border border-border/70 bg-card/40 px-3 py-2 text-xs">
      <span className="text-muted-foreground">Environment</span>
      <select
        value={value ?? ""}
        disabled={environments.length === 0}
        onChange={(event) => {
          const next = event.currentTarget.value as EnvironmentId;
          if (next) onChange(next);
        }}
        aria-label="Schedule environment"
        className="min-w-0 flex-1 appearance-none bg-transparent text-right font-medium text-foreground outline-none"
      >
        {environments.map((environment) => (
          <option key={environment.environmentId} value={environment.environmentId}>
            {environment.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ScheduleCard({
  schedule,
  pendingAction,
  onAction,
}: {
  readonly schedule: RuneSchedule;
  readonly pendingAction: string | null;
  readonly onAction: (schedule: RuneSchedule, action: LifecycleAction) => void;
}) {
  const actionInFlight = pendingAction?.startsWith(`${schedule.id}:`) === true;
  const isActive = schedule.status === "active";
  const isPaused = schedule.status === "paused";
  const canRun = isActive || isPaused;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3 border-b border-border/60 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-base">{schedule.name}</CardTitle>
              <Badge size="sm" variant={statusVariant(schedule.status)}>
                {formatScheduleStatus(schedule.status)}
              </Badge>
            </div>
            <CardDescription className="mt-2 flex items-center gap-1.5 text-xs">
              <Clock3Icon className="size-3.5" aria-hidden />
              {formatScheduleTrigger(schedule.trigger, schedule.displayTimeZone)}
            </CardDescription>
          </div>
          <span className="shrink-0 rounded-md bg-muted/55 px-2 py-1 text-[11px] font-medium text-muted-foreground">
            Prompt
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Next run
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {formatScheduleNextRun(schedule.nextRunAt, schedule.displayTimeZone)}
          </p>
        </div>
        <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {schedule.target.type === "prompt" ? schedule.target.prompt : "Action schedule"}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {isActive ? (
            <Button
              size="sm"
              variant="outline"
              disabled={actionInFlight}
              onClick={() => onAction(schedule, "pause")}
            >
              <PauseIcon /> Pause
            </Button>
          ) : isPaused ? (
            <Button
              size="sm"
              variant="outline"
              disabled={actionInFlight}
              onClick={() => onAction(schedule, "resume")}
            >
              <PlayIcon /> Resume
            </Button>
          ) : null}
          {canRun ? (
            <Button
              size="sm"
              variant="ghost-muted"
              disabled={actionInFlight}
              onClick={() => onAction(schedule, "run-now")}
            >
              <RotateCcwIcon /> Run now
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost-muted"
            disabled={actionInFlight}
            onClick={() => onAction(schedule, "delete")}
          >
            <Trash2Icon /> Delete
          </Button>
          {actionInFlight ? (
            <LoaderCircleIcon className="ms-1 size-4 animate-spin text-muted-foreground" aria-label="Updating schedule" />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function PromptScheduleForm({
  environmentId,
  onFeedback,
}: {
  readonly environmentId: EnvironmentId | null;
  readonly onFeedback: (feedback: { readonly kind: "success" | "error"; readonly message: string }) => void;
}) {
  const createSchedule = useAtomCommand(schedulesEnvironment.create);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [threadId, setThreadId] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("once");
  const [startAt, setStartAt] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState("3600");
  const [approvalPolicy, setApprovalPolicy] = useState<"inherit" | "never" | "always">("inherit");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setPrompt("");
    setThreadId("");
    setStartAt("");
    setIntervalSeconds("3600");
    setTriggerType("once");
    setApprovalPolicy("inherit");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (environmentId === null) {
      onFeedback({ kind: "error", message: "Connect an environment before creating a schedule." });
      return;
    }
    const normalizedName = name.trim();
    const normalizedPrompt = prompt.trim();
    const normalizedThreadId = threadId.trim();
    const runAt = localDateTimeToIso(startAt);
    const everySeconds = Number.parseInt(intervalSeconds, 10);
    if (!normalizedName || !normalizedPrompt || !normalizedThreadId || runAt === null) {
      onFeedback({ kind: "error", message: "Name, prompt, thread ID, and a valid start time are required." });
      return;
    }
    if (triggerType === "interval" && (!Number.isSafeInteger(everySeconds) || everySeconds <= 0)) {
      onFeedback({ kind: "error", message: "The interval must be a positive number of seconds." });
      return;
    }

    let input: ScheduleCreateInput;
    try {
      input = {
        idempotencyKey: TrimmedNonEmptyString.make(makeIdempotencyKey("create")),
        name: TrimmedNonEmptyString.make(normalizedName),
        environmentId,
        trigger:
          triggerType === "once"
            ? { type: "once", runAt: ScheduleDateTime.make(runAt) }
            : { type: "interval", firstRunAt: ScheduleDateTime.make(runAt), everySeconds: PositiveInt.make(everySeconds) },
        target: {
          type: "prompt",
          threadId: ThreadId.make(normalizedThreadId),
          prompt: TrimmedNonEmptyString.make(normalizedPrompt),
        },
        policy: {
          approvalPolicy,
          allowProviderFallback: false,
          catchUp: "coalesce-one",
        },
        displayTimeZone: IanaTimezone.make(DEFAULT_TIME_ZONE),
      };
    } catch {
      onFeedback({ kind: "error", message: "Check the schedule fields and try again." });
      return;
    }

    setIsSubmitting(true);
    const result = await create({ environmentId, input });
    setIsSubmitting(false);
    if (AsyncResult.isSuccess(result)) {
      reset();
      onFeedback({ kind: "success", message: "Schedule created." });
    } else {
      onFeedback({ kind: "error", message: "The schedule could not be created." });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-[var(--rune-violet-strong)]">
          <SparklesIcon className="size-4" aria-hidden />
          <CardTitle className="text-base">Create a prompt schedule</CardTitle>
        </div>
        <CardDescription>
          Send a prompt to an existing RUNE thread on a one-time or repeating cadence.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5 text-sm font-medium">
            Name
            <Input nativeInput value={name} onChange={(event) => setName(event.currentTarget.value)} placeholder="Morning project check-in" required />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Prompt
            <Textarea value={prompt} onChange={(event) => setPrompt(event.currentTarget.value)} placeholder="Review overnight changes and summarize anything that needs attention." required />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Target thread ID
            <Input nativeInput value={threadId} onChange={(event) => setThreadId(event.currentTarget.value)} placeholder="thread:…" required />
            <span className="block text-xs font-normal leading-relaxed text-muted-foreground">
              Use the thread ID from the existing conversation. The selected environment is always used for dispatch.
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium">
              Repeat
              <select
                value={triggerType}
                onChange={(event) => setTriggerType(event.currentTarget.value as TriggerType)}
                className="h-8.5 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-7.5"
              >
                <option value="once">Once</option>
                <option value="interval">Repeating interval</option>
              </select>
            </label>
            {triggerType === "interval" ? (
              <label className="block space-y-1.5 text-sm font-medium">
                Every (seconds)
                <Input nativeInput type="number" min="1" value={intervalSeconds} onChange={(event) => setIntervalSeconds(event.currentTarget.value)} required />
              </label>
            ) : null}
          </div>
          <label className="block space-y-1.5 text-sm font-medium">
            {triggerType === "once" ? "Run at" : "First run at"}
            <Input nativeInput type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.currentTarget.value)} required />
            <span className="block text-xs font-normal text-muted-foreground">Your local time · {DEFAULT_TIME_ZONE}</span>
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Approval policy
            <select
              value={approvalPolicy}
              onChange={(event) => setApprovalPolicy(event.currentTarget.value as typeof approvalPolicy)}
              className="h-8.5 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-7.5"
            >
              <option value="inherit">Inherit thread policy</option>
              <option value="never">Never ask for approval</option>
              <option value="always">Always ask for approval</option>
            </select>
          </label>
          <Button type="submit" className="w-full" disabled={environmentId === null || isSubmitting}>
            {isSubmitting ? <LoaderCircleIcon className="animate-spin" /> : <PlusIcon />}
            {isSubmitting ? "Creating…" : "Create schedule"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function SchedulesPage() {
  const { environments, isReady } = useEnvironments();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const [environmentOverride, setEnvironmentOverride] = useState<EnvironmentId | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ readonly kind: "success" | "error"; readonly message: string } | null>(null);
  const environmentId = environmentOverride ?? primaryEnvironmentId ?? environments[0]?.environmentId ?? null;
  const schedulesQuery = useEnvironmentQuery(
    environmentId === null ? null : schedulesEnvironment.list({ environmentId, input: {} }),
  );
  const pause = useAtomCommand(schedulesEnvironment.pause);
  const resume = useAtomCommand(schedulesEnvironment.resume);
  const runNow = useAtomCommand(schedulesEnvironment.runNow);
  const remove = useAtomCommand(schedulesEnvironment.remove);
  const schedules = schedulesQuery.data?.schedules ?? [];

  const handleAction = async (schedule: RuneSchedule, action: LifecycleAction) => {
    if (environmentId === null) return;
    if (action === "delete" && !window.confirm(`Delete “${schedule.name}”?`)) return;
    setPendingAction(`${schedule.id}:${action}`);
    const input = {
      scheduleId: ScheduleId.make(schedule.id),
      idempotencyKey: TrimmedNonEmptyString.make(makeIdempotencyKey(action, schedule.id)),
      expectedVersion: schedule.version,
    };
    const result =
      action === "pause"
        ? await pause({ environmentId, input })
        : action === "resume"
          ? await resume({ environmentId, input })
          : action === "run-now"
            ? await runNow({ environmentId, input })
            : await remove({ environmentId, input });
    setPendingAction(null);
    if (AsyncResult.isSuccess(result)) {
      setFeedback({ kind: "success", message: action === "delete" ? "Schedule deleted." : "Schedule updated." });
    } else {
      setFeedback({ kind: "error", message: "The schedule action could not be completed." });
    }
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--rune-surface-canvas)]" data-rune-schedules-page>
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <header className="flex flex-col gap-5 border-b border-border/70 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--rune-violet-strong)]">
              <CalendarClockIcon className="size-3.5" aria-hidden />
              RUNE / Schedules
            </div>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl">
              Work that starts when you are away.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Create durable prompt schedules for an environment and keep their lifecycle controls close at hand.
            </p>
          </div>
          <EnvironmentPicker environments={environments} value={environmentId} onChange={setEnvironmentOverride} />
        </header>

        {feedback ? (
          <div
            className={`mt-5 rounded-xl border px-3 py-2.5 text-sm ${feedback.kind === "error" ? "border-destructive/30 bg-destructive/8 text-destructive-foreground" : "border-success/30 bg-success/8 text-success-foreground"}`}
            role="status"
          >
            {feedback.message}
          </div>
        ) : null}

        {!isReady || schedulesQuery.isPending ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border/70 bg-card/20 p-6 text-sm text-muted-foreground" role="status">
            Loading schedules…
          </div>
        ) : schedulesQuery.error ? (
          <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/8 p-6 text-sm text-destructive-foreground" role="alert">
            {schedulesQuery.error}
          </div>
        ) : (
          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(18rem,25rem)_minmax(0,1fr)]">
            <PromptScheduleForm
              environmentId={environmentId}
              onFeedback={setFeedback}
            />
            <section aria-labelledby="schedules-list-title">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 id="schedules-list-title" className="text-lg font-semibold tracking-tight text-foreground">Your schedules</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{schedules.length} configured {schedules.length === 1 ? "schedule" : "schedules"}</p>
                </div>
              </div>
              {schedules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-card/20 p-10 text-center">
                  <CalendarClockIcon className="mx-auto size-6 text-muted-foreground/70" aria-hidden />
                  <p className="mt-3 text-sm font-medium text-foreground">No schedules yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Create a prompt schedule to make a thread do useful work on its own cadence.</p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {schedules.map((schedule) => (
                    <ScheduleCard key={schedule.id} schedule={schedule} pendingAction={pendingAction} onAction={handleAction} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
