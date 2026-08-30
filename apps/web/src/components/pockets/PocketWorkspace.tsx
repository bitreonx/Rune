import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleAlertIcon,
  Clock3Icon,
  Columns3Icon,
  ListIcon,
  LoaderCircleIcon,
  SearchIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";
import {
  readPocketViewState,
  writePocketViewState,
  type PocketViewState,
} from "../../pockets/pocketProjection";
import type { PocketId } from "@rune/contracts";
import { PocketShelf } from "./PocketShelf";
import {
  filterPocketThreads,
  groupPocketThreads,
  POCKET_MOTION_SEQUENCE,
  sortPocketThreads,
  type PocketThreadStatus,
  type PocketWorkspaceThreadData,
} from "./pocketWorkspace.logic";

interface PocketChild {
  readonly id: string;
  readonly title: string;
  readonly threadCount: number;
}

const STATUS_LABELS: Record<PocketThreadStatus, string> = {
  working: "Working",
  waiting: "Waiting",
  "needs-you": "Needs you",
  done: "Done",
};

const STATUS_ICONS: Record<PocketThreadStatus, typeof LoaderCircleIcon> = {
  working: LoaderCircleIcon,
  waiting: Clock3Icon,
  "needs-you": CircleAlertIcon,
  done: CheckCircle2Icon,
};

export function PocketWorkspace(props: {
  readonly pocketId: PocketId;
  readonly title: string;
  readonly threads: ReadonlyArray<PocketWorkspaceThreadData>;
  readonly children?: ReadonlyArray<PocketChild>;
  readonly fileReferenceCount?: number;
  readonly onClose: () => void;
  readonly onOpenThread: (thread: PocketWorkspaceThreadData) => void;
  readonly renderProviderMark?: (thread: PocketWorkspaceThreadData) => ReactNode;
}) {
  const [savedState, setSavedState] = useState<PocketViewState>(() =>
    readPocketViewState(props.pocketId),
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const savedStateRef = useRef(savedState);

  useEffect(() => {
    const next = readPocketViewState(props.pocketId);
    savedStateRef.current = next;
    setSavedState(next);
  }, [props.pocketId]);

  useEffect(
    () => () => {
      writePocketViewState(props.pocketId, savedStateRef.current);
    },
    [props.pocketId],
  );

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = savedState.scrollTop ?? 0;
  }, [savedState.scrollTop, savedState.view]);

  const updateViewState = (patch: Partial<PocketViewState>) => {
    setSavedState(() => {
      // Scroll is intentionally kept in a ref during wheel events. Start from
      // that latest snapshot so changing a view or sort cannot erase it.
      const next = { ...savedStateRef.current, ...patch };
      savedStateRef.current = next;
      writePocketViewState(props.pocketId, next);
      return next;
    });
  };

  const filteredThreads = useMemo(
    () => filterPocketThreads(props.threads, savedState.query ?? ""),
    [props.threads, savedState.query],
  );
  const sortedThreads = useMemo(
    () => sortPocketThreads(filteredThreads, savedState.sort),
    [filteredThreads, savedState.sort],
  );
  const groups = useMemo(() => groupPocketThreads(filteredThreads), [filteredThreads]);
  const statusSummary = useMemo(
    () =>
      (Object.keys(STATUS_LABELS) as PocketThreadStatus[])
        .map(
          (status) =>
            `${groups.find((group) => group.status === status)?.threads.length ?? 0} ${STATUS_LABELS[status].toLowerCase()}`,
        )
        .join(" · "),
    [groups],
  );

  const renderThread = (thread: PocketWorkspaceThreadData) => {
    const StatusIcon = STATUS_ICONS[thread.status];
    return (
      <button
        key={thread.id}
        type="button"
        onClick={() => {
          updateViewState({ lastThreadKey: thread.id });
          props.onOpenThread(thread);
        }}
        className={cn(
          "group flex min-w-0 items-center gap-2 border-b border-border/45 px-2 py-2 text-left [content-visibility:auto] [contain-intrinsic-block-size:44px] transition-colors hover:bg-accent/55 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          savedState.view === "compact" && "py-1 text-xs",
        )}
        data-rune-pocket-thread={thread.id}
        data-rune-pocket-thread-status={thread.status}
      >
        <span className="grid size-5 shrink-0 place-items-center" aria-hidden>
          {props.renderProviderMark?.(thread) ?? (
            <span className="text-[10px] font-semibold text-muted-foreground">
              {thread.providerLabel.slice(0, 1).toUpperCase()}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-foreground">{thread.title}</span>
          {savedState.view !== "compact" && thread.subtitle ? (
            <span className="block truncate text-[11px] text-muted-foreground">
              {thread.subtitle}
            </span>
          ) : null}
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground"
          title={STATUS_LABELS[thread.status]}
        >
          <StatusIcon
            className={cn(
              "size-3.5",
              thread.status === "working" && "animate-spin motion-reduce:animate-none",
              thread.status === "needs-you" && "text-amber-600 dark:text-amber-300",
            )}
            aria-hidden
          />
          <span className="hidden sm:inline">{STATUS_LABELS[thread.status]}</span>
        </span>
        <ChevronRightIcon
          className="size-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden
        />
      </button>
    );
  };

  return (
    <section
      className="rune-pocket-workspace flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/70 bg-[var(--rune-surface-raised)] shadow-[0_14px_40px_-30px_color-mix(in_srgb,var(--rune-violet-strong)_55%,transparent)]"
      aria-label={`${props.title} Pocket workspace`}
      data-rune-pocket-workspace
      data-rune-pocket-state="open"
      data-rune-pocket-surface-state="open"
      data-rune-pocket-motion-phase="settle"
      data-rune-pocket-motion-finite="true"
      data-rune-pocket-motion-sequence={POCKET_MOTION_SEQUENCE}
    >
      <header className="flex min-w-0 flex-col gap-2 border-b border-border/60 p-2.5">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Close Pocket workspace"
            className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeftIcon className="size-3.5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-foreground">{props.title}</h2>
            <p className="truncate text-[10px] text-muted-foreground" title={statusSummary}>
              {props.threads.length} threads · {statusSummary}
              {props.fileReferenceCount ? ` · ${props.fileReferenceCount} files` : ""}
            </p>
          </div>
        </div>
        <PocketShelf
          threads={props.threads}
          onOpenThread={props.onOpenThread}
          renderProviderMark={props.renderProviderMark}
        />
        <div className="flex items-center gap-1.5">
          <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-2 text-muted-foreground focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
            <SearchIcon className="size-3.5 shrink-0" aria-hidden />
            <input
              value={savedState.query ?? ""}
              onChange={(event) => updateViewState({ query: event.target.value })}
              placeholder="Search this Pocket"
              aria-label="Search this Pocket"
              className="min-w-0 flex-1 bg-transparent py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </label>
          <div
            className="flex shrink-0 items-center rounded-md border border-border/60 p-0.5"
            role="group"
            aria-label="Pocket view"
          >
            {(
              [
                ["flow", ListIcon, "Flow"],
                ["compact", ListIcon, "Compact"],
                ["board", Columns3Icon, "Board"],
              ] as const
            ).map(([view, Icon, label]) => (
              <button
                key={view}
                type="button"
                aria-label={label}
                aria-pressed={savedState.view === view}
                onClick={() => updateViewState({ view })}
                className={cn(
                  "grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground",
                  savedState.view === view && "bg-accent text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="Pocket sort">
            {(
              [
                ["activity", "Activity"],
                ["title", "Title"],
                ["created", "Created"],
              ] as const
            ).map(([sort, label]) => (
              <button
                key={sort}
                type="button"
                aria-pressed={savedState.sort === sort}
                onClick={() => updateViewState({ sort })}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground",
                  savedState.sort === sort && "bg-accent text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground/70">
            {filteredThreads.length} shown
          </span>
        </div>
      </header>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        onScroll={(event) => {
          // Keep scrolling on the compositor path. Persist only the latest
          // position on unmount/Pocket switch instead of writing and
          // re-rendering on every wheel event.
          savedStateRef.current = {
            ...savedStateRef.current,
            scrollTop: event.currentTarget.scrollTop,
          };
        }}
      >
        {props.children && props.children.length > 0 ? (
          <div className="flex gap-1 overflow-x-auto border-b border-border/45 px-2 py-1.5">
            {props.children.map((child) => (
              <span
                key={child.id}
                className="shrink-0 rounded-md bg-accent/60 px-1.5 py-1 text-[10px] text-muted-foreground"
              >
                {child.title} · {child.threadCount}
              </span>
            ))}
          </div>
        ) : null}
        {savedState.view === "board" ? (
          <div className="grid min-w-[32rem] grid-cols-4 divide-x divide-border/45">
            {groups.map((group) => (
              <section
                key={group.status}
                aria-label={STATUS_LABELS[group.status]}
                className="min-w-0"
              >
                <h3 className="sticky top-0 z-[1] border-b border-border/45 bg-[var(--rune-surface-raised)] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {STATUS_LABELS[group.status]}{" "}
                  <span className="font-normal">{group.threads.length}</span>
                </h3>
                {group.threads.map(renderThread)}
              </section>
            ))}
          </div>
        ) : sortedThreads.length > 0 ? (
          <div>{sortedThreads.map(renderThread)}</div>
        ) : (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            {savedState.query ? "No matching threads" : "No threads in this Pocket yet"}
          </p>
        )}
      </div>
    </section>
  );
}
