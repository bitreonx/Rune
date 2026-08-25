import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { type KeyboardEvent as ReactKeyboardEvent, type Ref } from "react";

import { cn } from "~/lib/utils";

/**
 * Structural twin of the surface's TerminalSearchStatus so callers and tests
 * can pass plain objects.
 */
export interface TerminalSearchStatusLike {
  readonly query: string;
  readonly count: number;
  readonly activeIndex: number;
}

/** Badge text for the search row: position over total, a bare count, or silence. */
export function searchCountLabel(status: TerminalSearchStatusLike | null): string {
  if (!status || status.query.length === 0) return "";
  if (status.count === 0) return "No matches";
  if (status.activeIndex < 0) {
    return status.count === 1 ? "1 result" : `${status.count} results`;
  }
  return `${status.activeIndex + 1}/${status.count}`;
}

export type SearchInputAction = "next" | "previous" | "close";

/** Enter steps forward, Shift+Enter backward, Escape dismisses the row. */
export function searchInputKeyDown(event: {
  key: string;
  shiftKey: boolean;
}): SearchInputAction | null {
  if (event.key === "Escape") return "close";
  if (event.key === "Enter") return event.shiftKey ? "previous" : "next";
  return null;
}

interface ThreadTerminalSearchBarProps {
  readonly query: string;
  readonly status: TerminalSearchStatusLike | null;
  readonly inputRef?: Ref<HTMLInputElement>;
  readonly onQueryChange: (query: string) => void;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
  readonly onClose: () => void;
}

const actionButtonClass =
  "inline-flex size-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

function SearchActionButton(options: {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={actionButtonClass}
      aria-label={options.label}
      disabled={options.disabled}
      onClick={options.onClick}
      tabIndex={-1}
    >
      {options.children}
    </button>
  );
}

export function ThreadTerminalSearchBar({
  query,
  status,
  inputRef,
  onQueryChange,
  onNext,
  onPrevious,
  onClose,
}: ThreadTerminalSearchBarProps) {
  const hasMatches = (status?.count ?? 0) > 0;

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const action = searchInputKeyDown(event);
    if (!action) return;
    event.preventDefault();
    if (action === "close") onClose();
    else if (action === "previous") onPrevious();
    else onNext();
  };

  return (
    <div
      data-terminal-search="true"
      className="flex h-8 shrink-0 items-center gap-1 border-b border-border/50 bg-[var(--terminal-background)] pr-2 pl-2.5"
      onKeyDown={handleKeyDown}
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Find in terminal"
        aria-label="Search terminal"
        spellCheck={false}
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/70"
      />
      <span
        aria-live="polite"
        className={cn(
          "shrink-0 text-[11px] tabular-nums",
          status && status.query.length > 0 ? "text-muted-foreground" : "sr-only",
        )}
      >
        {searchCountLabel(status)}
      </span>
      <SearchActionButton label="Previous match" onClick={onPrevious} disabled={!hasMatches}>
        <ChevronUpIcon className="size-3.5" />
      </SearchActionButton>
      <SearchActionButton label="Next match" onClick={onNext} disabled={!hasMatches}>
        <ChevronDownIcon className="size-3.5" />
      </SearchActionButton>
      <span className="mx-0.5 h-4 w-px bg-border/60" aria-hidden="true" />
      <SearchActionButton label="Close search" onClick={onClose} disabled={false}>
        <XIcon className="size-3.5" />
      </SearchActionButton>
    </div>
  );
}
