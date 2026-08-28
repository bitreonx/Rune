# Chat-Scoped Changes — Ownership by Thread, Not by Workspace

> Spec status: **draft, awaiting maintainer review**. Generated from an architectural grill of the checkpoint / diff / read-model / UI stack. Fixes the "X changed files" badge (and every other changed-files surface) so it shows what *this* chat did — never the leftovers of other chats in the same workspace.

## 1. Why this change

When two RUNE chats share a workspace, today the per-turn "X changed files" badge can show the wrong set of files. Three concrete defects:

1. **Badge is per-turn, but the spec wants per-chat (cumulative).** `ChangedFilesCard` in `apps/web/src/components/chat/ChangedFilesTree.tsx:32-262` reads `turnSummary.files`, the per-turn diff. If a chat has 3 turns and the last turn only edited 1 file, the badge says "1 changed file" — even though the chat changed 3 files. The user reads the badge as the chat's total. The math is right per turn; the framing is wrong.
2. **First-turn baseline only fires on user input.** `ensurePreTurnBaselineFromDomainTurnStart` (`apps/server/src/orchestration/Layers/CheckpointReactor.ts:629-688`) ensures `refs/rune/checkpoints/<threadId>/turn/N` is captured when a `thread.turn-start-requested` or first `thread.message-sent` event lands. If a thread is created, the user never sends a message, and a turn is dispatched by other means (sub-agent rollup, queued turn), the from-ref for turn 1 doesn't exist, `diffCheckpoints` returns empty, and the user sees "0 changed files" for a turn that actually changed files.
3. **No durable "thread baseline" in the read model.** The baseline is a git ref, not a domain event. Reload has to discover it from git. There is no `thread.baseline.captured` event; there is no projection field for it. A subtle bug class — "did this thread ever have a baseline" — is answerable only by shelling out to `git rev-parse --verify`.

The fix: **make chat ownership a first-class concept in the read model**, then point every changed-files surface at it.

## 2. Principles

- **Chat owns the change, not the workspace.** A file is "in this chat" because a turn in this chat produced it, not because it's dirty in the working tree right now.
- **Per-turn and per-chat are both first-class.** `turnDiff` answers "what did this turn do." `chatDiff` answers "what has this chat done, in total." Both live in the read model; the badge shows the latter, the inline diff shows the former.
- **Baseline is durable and always present.** A thread has a baseline from creation, not from "first user message." A missing baseline is a server bug, not a fallback to HEAD.
- **One canonical source for every surface.** The web badge, the DiffPanel turn view, the Environment → Changes list, mobile ReviewSheet, and sub-agent rollups all read the same projection. No surface re-derives from raw `git status` when a thread is open.
- **Two-chats-touched-the-same-file is honest, not silent.** When two chats have legitimately modified the same file, both ownership histories persist and the UI surfaces the overlap.

## 3. Data model

### 3.1 New: thread baseline (durable)

`packages/contracts/src/orchestration.ts`:

```ts
export const OrchestrationThreadBaseline = Schema.Struct({
  checkpointRef: CheckpointRef,
  capturedAt: IsoDateTime,
  /** "thread-created" | "first-user-message" | "recovery" */
  source: Schema.Literals(["thread-created", "first-user-message", "recovery"]),
});
export type OrchestrationThreadBaseline = typeof OrchestrationThreadBaseline.Type;
```

Add to `OrchestrationThread`:

```ts
checkpoints: Schema.Array(OrchestrationCheckpointSummary), // unchanged
chatDiff: Schema.Struct({
  files: Schema.Array(OrchestrationCheckpointFile),
  computedAt: IsoDateTime,
  throughTurnCount: NonNegativeInt,
}),
baseline: Schema.NullOr(OrchestrationThreadBaseline),
fileOwnership: Schema.Array(Schema.Struct({
  path: TrimmedNonEmptyString,
  owners: Schema.Array(Schema.Struct({
    threadId: ThreadId,
    throughTurnCount: NonNegativeInt,
    additions: NonNegativeInt,
    deletions: NonNegativeInt,
  })),
})),
```

`chatDiff.files` is the union of per-turn `files` in the current thread, deduped by path with additions/deletions summed. It is recomputed on every `thread.turn-diff-completed` event by the projector.

`baseline` is written when a baseline is captured. The capture reactor dispatches `thread.baseline-captured` so the read model has it. Reload reads the projection, not git.

`fileOwnership` lists every path that any *ready* checkpoint in this thread has touched, plus the per-owner counts. When two threads have both touched `X.tsx`, each thread's `fileOwnership` for `X.tsx` lists both `threadId`s.

### 3.2 New: `thread.baseline-captured` event

```ts
export const ThreadBaselineCapturedPayload = Schema.Struct({
  threadId: ThreadId,
  checkpointRef: CheckpointRef,
  capturedAt: IsoDateTime,
  source: Schema.Literals(["thread-created", "first-user-message", "recovery"]),
});

export const ThreadBaselineCaptured = Schema.Struct({
  ...EventBaseFields,
  type: Schema.Literal("thread.baseline-captured"),
  payload: ThreadBaselineCapturedPayload,
});
```

Add to `OrchestrationEvent` union.

### 3.3 `OrchestrationCheckpointSummary` stays per-turn

`files` is the per-turn diff. The badge stops reading it. Inline file diffs keep reading it.

### 3.4 New: `OrchestrationGetChatDiff` query

Same shape as the existing `OrchestrationGetFullThreadDiff` (a single patch string) but with explicit naming and explicit semantics: "give me the cumulative diff this chat produced."

```ts
export const OrchestrationGetChatDiffInput = Schema.Struct({
  threadId: ThreadId,
  toTurnCount: NonNegativeInt,
  ignoreWhitespace: Schema.optionalKey(Schema.Boolean),
});
export const OrchestrationGetChatDiffResult = ThreadTurnDiff;
```

The existing `getFullThreadDiff` becomes a thin alias. `getChatDiff` is the one clients should call.

## 4. Server flow

### 4.1 Baseline capture — three paths, all durable

1. **`thread.created` event → capture at `turn/0`.** A new reactor `captureBaselineOnThreadCreate` (`apps/server/src/orchestration/Layers/CheckpointReactor.ts`) subscribes to `thread.created`. It captures a checkpoint at `refs/rune/checkpoints/<threadId>/turn/0` and dispatches `thread.baseline-captured` with `source: "thread-created"`. This is the durable fix for the first-turn bug. A thread always has a baseline before any turn runs.
2. **First user message / first turn-start (legacy).** Keep `ensurePreTurnBaselineFromDomainTurnStart`. After capture, dispatch `thread.baseline-captured` with `source: "first-user-message"`. (This is the recovery path for threads created by an older RUNE that did not capture on create — only the new projector writes `baseline`, but old threads can fill it in lazily.)
3. **Recovery.** A new reactor `recoverMissingBaseline` subscribes to `thread.turn-diff-completed` for any thread whose `baseline` field is null. It captures the baseline at the previous max turn count and dispatches `thread.baseline-captured` with `source: "recovery"`.

`captureAndDispatchCheckpoint` (`CheckpointReactor.ts:218-352`) keeps its current per-turn math. It does not need to change. The new code only adds: a `thread.baseline-captured` event after every successful capture, and the three new reactors.

### 4.2 Projector

`apps/server/src/orchestration/projector.ts` gains three handlers:

- `thread.baseline-captured` → write `thread.baseline = { checkpointRef, capturedAt, source }`.
- `thread.turn-diff-completed` → after writing the per-turn checkpoint, recompute `thread.chatDiff` and `thread.fileOwnership`. `chatDiff.files` is the deduped union of per-turn `files` for `status === "ready"` checkpoints, with additions/deletions summed per path. `fileOwnership[path].owners` appends `{ threadId, throughTurnCount, additions, deletions }` from this turn. If a different thread has already claimed this path (cross-thread query in `ProjectionSnapshotQuery`), the existing entry is preserved and the new owner is added.

The `thread.reverted` handler clears `chatDiff` and `fileOwnership` to the post-revert state (recompute from retained checkpoints, same way today the per-turn `checkpoints` array is filtered).

### 4.3 Diff query

`apps/server/src/checkpointing/CheckpointDiffQuery.ts` gains `getChatDiff`. It is `getFullThreadDiff` with a renamed input (`threadId`, `toTurnCount`) and a named result type. The implementation does not change; the contract is the chat-cumulative diff from `turn/0` (baseline) to `toTurnCount`.

The pre-existing `getTurnDiff` keeps its per-turn shape. The DiffPanel still uses it for the "this turn only" developer view.

### 4.4 First-turn guarantee

`getChatDiff` and `getTurnDiff` both use `fromCheckpointRef = checkpointRefForThreadTurn(threadId, 0)`. There is no `fallbackFromToHead: true` anywhere in the new code path. If the baseline ref is missing, the query returns `CheckpointBaselineMissingError` (a new typed error in `apps/server/src/checkpointing/Errors.ts`) and the UI renders an empty state with "Baseline missing — try restarting the chat." No silent fallbacks.

## 5. Sub-agent and provider rollup

Sub-agents (Codex children, workflow members) share the parent thread's working tree. They do not have their own `threadId`. Their file mutations appear in the parent thread's `chatDiff` because the parent thread's `turnDiff` includes them. The only fix needed is to make sure the parent turn's per-turn `files` array captures sub-agent work:

- `apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts:1956-1991` — when `turn.diff.updated` arrives carrying per-item file changes (Codex, Claude, Cursor all emit them in different shapes), fold them into the dispatched `thread.turn-diff-complete` payload as the per-turn `files` array. Today, this branch dispatches `files: []` and lets the CheckpointReactor's later `captureCheckpointFromPlaceholder` swap in a real git-based diff. Both paths should converge on the same `files` array: union of (a) provider-reported item changes, (b) `git diff` parsed from the checkpoint.

The per-turn `files` for a parent turn that ran 3 sub-agents now contains every file those sub-agents touched, in addition to anything the parent agent itself wrote. The chat's `chatDiff` covers the whole rollup.

## 6. Web surfaces

### 6.1 `ChangedFilesCard` (the badge in the screenshot)

`apps/web/src/components/chat/ChangedFilesTree.tsx`:

- Replace `files: ReadonlyArray<TurnDiffFileChange>` with `chatDiff: ReadonlyArray<TurnDiffFileChange>` and `turnDiff: ReadonlyArray<TurnDiffFileChange>`.
- The header (`{n} changed files`, addition/deletion chip) reads `chatDiff`.
- The compact preview (`ChangedFilesTree.tsx:208-258`) reads `chatDiff`.
- The expanded tree body shows `chatDiff` by default. A new "Show this turn only" toggle inside the header reveals `turnDiff` for the developer view.
- The "Open diff" button on the header opens the chat-cumulative diff: `useDiffPanelStore.getState().selectChat(threadRef, { fromTurnCount: 0, toTurnCount: turnSummary.checkpointTurnCount })`. The per-file chips in the tree body keep opening the per-turn diff.
- The "Undo this turn" action stays per-turn (it must — the git ref is per-turn).

### 6.2 `MessagesTimeline`

`apps/web/src/components/chat/MessagesTimeline.tsx`:

- `AssistantChangedFilesSection` reads `turnSummary.threadSnapshot.chatDiff` (new projection field) and `turnSummary.turnDiff` (renamed from `turnSummary.files` for clarity). Both are server-projected, both are stable across reloads.
- The inline `InlineFileDiff` (per-file expand) keeps reading `turnDiff`.
- The "Open diff" action flows through a new `onOpenChatDiff` callback that takes `{ fromTurnCount, toTurnCount, filePath? }` instead of just `turnId, filePath?`.

### 6.3 `DiffPanel`

`apps/web/src/components/DiffPanel.tsx`:

- The chat-cumulative view (the new default from the badge) calls `useCheckpointDiff({ fromTurnCount: 0, toTurnCount })` — already supported by the existing query (`getFullThreadDiff`).
- The turn view (existing developer path) keeps `useCheckpointDiff({ fromTurnCount: N-1, toTurnCount: N })`.
- The branch / unstaged views (raw git) are explicitly labeled "Workspace branch diff" and "Workspace unstaged diff" so the user knows they are not chat-scoped.

### 6.4 `FileBrowserPanel` (Environment → Changes)

`apps/web/src/components/files/FileBrowserPanel.tsx`:

- When a `routeThreadKey` is active, the tree filters to `path ∈ thread.chatDiff.files`. The header reads "Changes in this chat: N files." The status bar shows the chat's ownership badge.
- When no thread is active, the tree shows all workspace files (no change to `projectEnvironment.listEntries`). The header reads "Workspace files: N entries" and an info chip explains "Open a chat to see its changes."
- A toggle in the panel header switches between "Chat changes" and "All workspace files" when a thread is active.

### 6.5 Sidebar / sidebar pills

`apps/web/src/components/Sidebar.tsx`, `LegacySidebar.tsx`, `ThreadStatusIndicators.tsx`:

- These read `vcsEnvironment.status` for branch / provider info only — they do not list files. No change.
- `apps/web/src/components/GitActionsControl.tsx:1090-1113` reads `gitStatus.workingTree.files` for the commit/stage UI. This is the only raw-git file-list site. It is explicitly labeled "Stage" (not "this chat's changes") and stays as-is. The user can still see and stage dirty files from other chats; the commit message field warns "Workspace has changes from another chat."

### 6.6 Mobile review

`apps/mobile/src/features/review/`:

- `useReviewSections.ts` and `reviewModel.ts` gain a `chatSection: ReviewSectionItem` at the top of the section list, sourced from `thread.chatDiff`. Per-turn sections stay.
- `ReviewSheet` header labels the chat section "Changes in this chat" and the per-turn sections keep their per-turn title.

## 7. Persistence and reload

The new fields (`chatDiff`, `baseline`, `fileOwnership`) live in the projection tables. Reload reads the projection, not git. The migration to add columns is straightforward: `apps/server/src/persistence/Migrations/` gets a new numbered migration that adds nullable columns to `projection_threads` and back-fills `chatDiff` from existing per-turn `checkpoints` JSON on every thread.

- `baseline_checkpoint_ref TEXT NULL`
- `baseline_captured_at TEXT NULL`
- `baseline_source TEXT NULL`
- `chat_diff_json TEXT NULL`
- `chat_diff_through_turn_count INTEGER NULL`
- `file_ownership_json TEXT NULL`

Back-fill runs in the migration: for each thread, read all `projection_turns.checkpoint_files_json` where `checkpoint_status = 'ready'`, dedupe, sum, write to `chat_diff_json`. Set `chat_diff_through_turn_count` to the max `checkpoint_turn_count` for the thread.

## 8. Tests

### 8.1 Server — `apps/server/src/orchestration/Layers/CheckpointReactor.test.ts` (extend)

- **Case 1 — two chats, same dirty worktree.** Drive `ProviderRuntimeEvent` for chat A (3 turns), then `thread.created` for chat B in the same cwd (still dirty), then a turn for chat B. Assert: chat A's `chatDiff` = A's 3 files; chat B's `chatDiff` = B's files only. Assert no `fallbackFromToHead` was used — grep the implementation; assert `CheckpointBaselineMissingError` is what surfaces when the baseline is removed.
- **Case 2 — cumulative turns.** Drive 3 turns in one chat, each editing a new file. Assert: turn 1's `turnDiff` = 1 file; turn 2's `turnDiff` = 1 file; chat's `chatDiff` = 3 files (deduped, summed).
- **Case 3 — first turn in dirty worktree.** Brand-new thread in a workspace with 5 dirty files (HEAD-clean). One turn that changes 1 file. Assert: chat's `chatDiff` = that 1 file, not 0, not 5+1. Assert `baseline` is set with `source: "thread-created"`.
- **Case 4 — same file, two chats.** Chat A changes `X.tsx`. Chat B (in same workspace) also changes `X.tsx`. Assert: chat A's `chatDiff` includes `X.tsx`; chat B's `chatDiff` includes `X.tsx`; both threads' `fileOwnership[X.tsx].owners` lists both `threadId`s.
- **Case 5 — reload.** Create two chats in the harness, drive their events, capture the projection snapshot. Tear down the runtime. Build a fresh runtime over the same `state.sqlite`. Re-query the snapshot. Assert `chatDiff`, `baseline`, `fileOwnership` survive the reload unchanged.

### 8.2 Server — `apps/server/src/checkpointing/CheckpointDiffQuery.test.ts` (extend)

- Assert `getChatDiff(threadId, 1)` returns the per-turn diff (turn 0 → turn 1) when turn 1 is the only turn.
- Assert `getChatDiff(threadId, 0)` returns an empty diff.
- Assert `getChatDiff` for a thread with no baseline returns `CheckpointBaselineMissingError` (not an empty diff, not a fallback to HEAD).

### 8.3 Server — `apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.test.ts` (extend)

- Drive a `turn.diff.updated` event with `payload.itemFileChanges = [{path: "A.ts"}, {path: "B.ts"}]`. Assert the dispatched `thread.turn-diff-complete` payload's `files` array contains both paths.

### 8.4 Web — `apps/web/src/components/chat/ChangedFilesTree.test.tsx` (extend)

- `ChangedFilesCard › "shows chat-cumulative count, not per-turn"`: pass `chatDiff = [a, b, c]`, `turnDiff = [a]`. Assert markup contains "3 changed files" and not "1 changed file". Assert the "Open diff" `aria-label`'s `onOpenTurnDiff` is called with `fromTurnCount: 0`.
- `ChangedFilesCard › "honors singular label for chat-cumulative"`: `chatDiff = [a]`. Assert "1 changed file".
- `ChangedFilesCard › "compact preview reads chatDiff"`: assert the file chips render `chatDiff` paths.
- `ChangedFilesCard › "tree body can toggle to per-turn via the dev toggle"`: assert the new toggle reveals `turnDiff`.

### 8.5 Web — `apps/web/src/components/chat/MessagesTimeline.test.tsx` (extend)

- Assert the `AssistantChangedFilesSection` reads `chatDiff` from the thread snapshot, not from `turnSummary.files`. Mock both and assert the badge uses `chatDiff`.
- Assert the inline `InlineFileDiff` still reads `turnDiff` for per-file expansion.

### 8.6 Web — `apps/web/src/components/files/FileBrowserPanel.test.tsx` (new, or extend)

- Mock a thread snapshot with `chatDiff = [a, b, c]` and a `projectEnvironment.listEntries` returning all workspace files. Assert the tree shows only `a, b, c` when a `routeThreadKey` is provided.
- Assert the "All workspace files" toggle reveals the full list and the header label changes.

### 8.7 Mobile — `apps/mobile/src/features/review/reviewModel.test.ts` (extend)

- Build a thread snapshot with `chatDiff = [a, b, c]` and 2 ready checkpoints. Assert `buildReviewSectionItems` returns a "Chat" section first, then the per-turn sections, and the chat section's `diff` matches the chat-cumulative diff.
- Assert the chat section is omitted when `chatDiff.files` is empty (don't show an empty section).

## 9. Completion gate

The work is done when all of these hold, verified by the tests in §8:

- ✓ Chat A never displays Chat B's changes (case 1, case 4).
- ✓ Chat B never inherits Chat A's existing dirty changes (case 1, case 3).
- ✓ First-turn attribution works (case 3, projection `baseline.source = "thread-created"`).
- ✓ Cumulative chat Changes works (case 2, badge reads `chatDiff`).
- ✓ Per-turn history remains available (case 2, `turnDiff` preserved, inline diffs unchanged).
- ✓ Overlapping-file ownership is handled (case 4, `fileOwnership` lists both owners).
- ✓ Reload persistence works (case 5, projection back-fill + fresh-runtime re-query).
- ✓ DiffPanel uses the same chat scope (DiffPanel chat-cumulative view = `getChatDiff`).
- ✓ Environment uses the same chat scope (`FileBrowserPanel` filters by `chatDiff`).
- ✓ Sub-agent threads inherit the same architecture (parent turn's `turnDiff` rolls up sub-agent item changes; `chatDiff` covers the whole chat).
- ✓ Focused tests pass (`vp test run` on the touched files).
- ✓ Typecheck passes (`vp run typecheck` on the touched packages).
- ✓ Real RUNE UI was manually verified (one chat opened, one turn run, badge + Open diff + Environment changes inspected).

## 10. Out of scope (deliberately)

- **Branch / unstaged views in the DiffPanel.** Those are explicitly workspace-wide by design. Labeling makes the scope clear; the data shape is unchanged.
- **PR / GitHub diff surfaces.** Out of scope until a follow-up spec.
- **Per-file chat ownership UI affordances beyond the file list.** When two chats have touched the same file, the badge shows the file once with an "also changed in <other chat>" tooltip. A full per-file overlap panel is a future spec.
- **Stashing / cleaning the working tree between chats.** The new architecture does not require the working tree to be clean. A chat starting in a dirty workspace correctly attributes only the files it modified. Stashing is a separate UX call.
- **Cross-environment / cross-project change tracking.** A chat is scoped to one project, one cwd. Cross-project changes are not tracked.
