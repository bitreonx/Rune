# Chat Surface — Codex/Cursor Glass-class IDE Direction

> Spec status: **draft, awaiting maintainer review**. Generated from a code review of `apps/web/src/components/ChatView.tsx`, `apps/web/src/components/agent-chat/AgentChatPanel.tsx`, `apps/web/src/components/chat/ChatComposer.tsx`, `apps/web/src/components/chat/ComposerPromptQueue.tsx`, `apps/web/src/components/chat/MessagesTimeline.tsx`, `apps/web/src/components/chat/MessagesTimeline.logic.ts`, `apps/web/src/components/chat/ContextWindowMeter.tsx`, `apps/web/src/components/ChatMarkdown.tsx`, `apps/web/src/components/RuneMark.tsx`, `apps/web/src/components/chat/ComposerAttachmentCapability.tsx`, `apps/web/src/composer-logic.ts`, `apps/web/src/composerGoal.ts`, `apps/web/src/session-logic.ts`, `apps/web/src/contextMenuFallback.ts`, `apps/web/src/state/usage.ts`, and the contracts at `packages/contracts/src/providerRuntime.ts`.

## 1. Principles

The chat is a **Codex/Cursor Glass-class IDE surface**, not a Notion clone. There is no card-inside-card-inside-card paper feel. There is exactly one card on the page: the composer. Everything else is a row, and each row kind carries its own shape.

- **User rows are contained surfaces** — a single rounded card with the user's text. Markdown lives inside the card. Nothing else wraps the card. Anchored right or full-width with a max-width. The long-message fold at the bottom of the user card stays.
- **Assistant rows are an open canvas** — text flows into the canvas with no rounded container and no per-message chrome. A small header (`model · provider · $cost`) precedes the first paragraph. A small footer (`timestamp · copy · regenerate`) sits at the end. Both read as annotations, not as a card.
- **Semantic activity is an inline rail** in the assistant flow. Tool calls, file edits, and subagent dispatches are one-line receipts (`●  Edited src/foo.ts (+12 -3)`), not cards. Consecutive receipts collapse into a stack with a count.
- **Subagents are collaborator rows** (`▲  test-runner  claude-sonnet-4  ·  $0.04`) with a small disclosure (`3 files · 6m · Running tests`). Click → opens the LIVE child thread in the right rail (Codex-class). The parent remains visible. The right rail's existing tab system gets a "child thread" mode; the rail's per-thread state is extended to carry a `selectedChildThreadId` pointer. See §2.4.
- **Goals are integrated with the composer.** The goal field lives at the top of the composer (above the textarea). The slash command `/goal …` stays. The localStorage key moves to the thread store for multi-window safety. The "active goal" banner in the timeline is removed.
- **The composer is a card on the page** — the only card. The shell is one rounded surface with the goal field at the top, the textarea in the middle, the queue + queue-stack paper-feel underneath, the toolbar at the bottom. The shell is liquid-glass (per dashboard spec).
- **Code blocks are inset cards within the assistant canvas**, not cards stacked on cards. The surrounding assistant text is not wrapped in a card.
- **No continuous animations.** Spinners step; they don't sweep. The stream caret is a 6×6 dot that opacity-steps 1→0.4 while streaming. Respect `prefers-reduced-motion`.
- **Change ownership is from the Thread Mutation Ledger, not from a generic git status.** Two chats mutating the same worktree get isolated worktrees by default; the ledger provides audit + ownership in both modes. See §2.6.

The shared primitive is **the timeline row kind**, not a `MessageCard` wrapper: `UserTimelineRow` + `AssistantTimelineRow` + `InlineReceiptRow` + `SubagentRow` + `WorkingRow` + `ReasoningRow` + `TurnFoldRow`.

## 2. The timeline row kinds

`apps/web/src/components/chat/MessagesTimeline.logic.ts:776` (`deriveMessagesTimelineRows`) and `:1209` (`computeStableMessagesTimelineRows`) project messages into one of these row kinds. New kinds land here: `inline-receipt` and `subagent`.

### 2.1 `UserTimelineRow` (contained surface)

Keeps today's `MessagesTimeline.tsx:1052` shape — the user bubble that already works. Single rounded card; nothing wraps the card.

```tsx
<article
  className="self-end max-w-[80%] rounded-2xl bg-message p-3 text-message-foreground"
  data-role="user"
  data-message-id={message.id}
>
  <UserMessageBody markdown={message.markdown} shared={shared} />
  {/* paper-folded bottom stays at MessagesTimeline.tsx:1968-2014 */}
</article>
```

- `UserMessageBody` renders `ChatMarkdown` inside the card.
- The paper-folded bottom (`WebkitMaskImage`, `MessagesTimeline.tsx:1968-2014`) stays. The user bubble gets a small notch at the bottom-right when folded.
- `data-role="user"` is the contract for downstream styling, e2e selectors, and the keyboard nav layer.

### 2.2 `AssistantTimelineRow` (open canvas)

Replaces `MessagesTimeline.tsx:1198-1244`. The wrapping `<div className="rounded-2xl bg-message p-3 …">` for the assistant body is **deleted**. The row is an article, the body is open, the chrome is two annotations.

```tsx
<article
  className="relative min-w-0 px-1 py-0.5"
  data-role="assistant"
  data-message-id={message.id}
  data-streaming={isStreaming ? "true" : undefined}
>
  <AssistantHeader message={message} shared={shared} />
  <div className="mx-auto max-w-3xl">
    <ChatMarkdown markdown={message.markdown} shared={shared} />
    <AssistantChangedFilesSection message={message} shared={shared} />
    <AssistantFooter message={message} shared={shared} />
  </div>
  {/* the streaming caret attaches to the end of the last sentence via data-streaming */}
</article>
```

- `AssistantHeader` is `apps/web/src/components/chat/AssistantHeader.tsx` (NEW). A muted `model · provider · $0.0123` line. The cost chip comes from `ThreadTokenUsageSnapshot.costUsd` (`packages/contracts/src/providerRuntime.ts:316`) when the rate-table hoist lands (usage spec PR 3). MVS shows the model + provider without the cost.
- `AssistantChangedFilesSection` is today's `MessagesTimeline.tsx:1220-1225`, kept.
- `AssistantFooter` is `apps/web/src/components/chat/AssistantFooter.tsx` (NEW). `timestamp · copy · regenerate`. Styled to read as an annotation, not a card.
- The article is the canvas. The body bleeds full-width up to `max-w-3xl mx-auto` for readability (open question 12.1 — see §12 for the trade-off; the recommendation is `max-w-3xl mx-auto`).
- The live caret (`MessagesTimeline.tsx:1214-1218`, currently a static 2px bar) becomes a 6×6 dot that opacity-steps 1→0.4 while `data-streaming` is `"true"`. Respects `prefers-reduced-motion`.

### 2.3 `InlineReceiptRow` (one line)

`apps/web/src/components/chat/InlineReceiptRow.tsx` (NEW). The shared primitive for tool calls, file edits, command runs, and patch headers.

```tsx
<button
  type="button"
  className="flex w-full items-center gap-2 py-0.5 text-left text-xs text-muted-foreground hover:text-foreground"
  data-tool-name={receipt.toolName}
  data-receipt-id={receipt.id}
>
  <span aria-hidden className="size-1.5 rounded-full bg-current" />
  <span className="font-mono">{receipt.label}</span>
  {receipt.tail && <span className="text-muted-foreground/80">· {receipt.tail}</span>}
</button>
```

- The leading dot is `data-tool-name`; the label is `font-mono` so file paths and command lines read as code, not as prose.
- Multiple consecutive receipts in a turn collapse into a stack. The collapse is a native `<details>` (open question 12.3 — see §12). The summary is `3 more receipts`. No JS state.
- The collapse lives at the point in the assistant flow where the receipts occurred; expanding does not scroll-jump.

### 2.4 `SubagentRow` (collaborator row → live child thread in the right rail)

`apps/web/src/components/chat/SubagentRow.tsx` (NEW). Subagent dispatches in the assistant flow. The row is a lightweight disclosure, not a transcript host.

```tsx
<article
  className="mx-auto w-full max-w-3xl"
  data-subagent-id={subagent.id}
>
  <button
    type="button"
    className="flex w-full items-center gap-2 py-1 text-left text-xs text-muted-foreground hover:text-foreground"
    onClick={onOpenInRightRail}
  >
    <span aria-hidden className="text-[10px]">▲</span>
    <span className="font-mono">{subagent.name}</span>
    <span className="text-muted-foreground/80">· {subagent.model}</span>
    <span className="text-muted-foreground/80">· {subagent.disclosure}</span>
    {subagent.costUsd != null && (
      <span className="text-muted-foreground/80">· ${subagent.costUsd.toFixed(4)}</span>
    )}
  </button>
</article>
```

- The disclosure is a small `3 files · 6m · Running tests` line (token counts, elapsed time, current verb). It updates as the subagent streams; it is a status, not a transcript.
- Clicking the row opens the **LIVE child thread in the right rail** (Codex-class). The parent thread remains visible in the main canvas. The right rail's existing tab system gains a "child thread" mode; the rail's per-thread state (`apps/web/src/rightPanelStore.ts:67`, `:86`) is extended to carry a `selectedChildThreadId: string | null` per thread key.
- The row never hosts a transcript. The frozen-inline-transcript pattern is rejected — it regresses the live child thread UX. The conversation, reasoning, semantic activity, tasks, changed files, and developer trace all live in the right rail and update live as the subagent streams.
- The composer inside the rail (`message Vega…`) sends a follow-up to the child thread, not the parent.

### 2.4.1 Subagent inspection in the right rail

`apps/web/src/components/chat/ChildThreadRail.tsx` (NEW). The right-rail live child thread surface.

- The right rail's `Agents` tab (existing; `apps/web/src/components/RightPanelSheet.tsx:1-43`) gains a new sub-state: when a `SubagentRow` is clicked, the tab content switches from the agents overview to the live child thread.
- The rail's content uses the same `MessagesTimeline` + `ChatComposer` shapes (or a slimmed-down variant) but scoped to the child thread: `messages={childThread.messages}`, `onSend={sendToChildThread}`. The reasoning section, semantic activity (via `InlineReceiptRow`), tasks, changed files, and developer trace all live inside this rail surface.
- The composer inside the rail is a small `message <name>…` input. It sends a follow-up to the child thread, not the parent. The rail's `data-role="child-thread"` slot scopes the composer so its submit handler routes to the child.
- The parent thread is unaffected. The right rail is a separate "inspection surface" — toggling it does not change the parent canvas scroll position, the parent's composer draft, or the parent's selected model.
- The `rightPanelStore` (`apps/web/src/rightPanelStore.ts:67, 86`) shape extends from `ThreadRightPanelState` to:

  ```ts
  interface ThreadRightPanelState {
    open: boolean;
    mode: RightPanelMode;          // existing: 'terminal' | 'diff' | 'files' | 'browser' | 'agents' | 'prs'
    selectedChildThreadId: string | null;  // NEW: when mode === 'agents' and a subagent row was clicked
  }
  ```

- State persistence: the `selectedChildThreadId` follows the existing `RIGHT_PANEL_STORAGE_KEY` pattern. Two windows on the same thread see the same selected child.

### 2.5 `WorkingRow`, `ReasoningRow`, `TurnFoldRow` (kept)

- `WorkingRow` (`MessagesTimeline.tsx:1387-1411`): `●  Working for 4s…` with step-state, not transform tween.
- `ReasoningRow` (`MessagesTimeline.tsx:1443-1463`): collapsible, `data-reasoning-text` for the body.
- `TurnFoldRow` (`MessagesTimeline.tsx:1560-1565`): collapse for the prior turn. The `live-activity-focus-counter` is **audited and converted to a discrete state on user interaction** — no per-frame transform.

### 2.6 Change ownership architecture (Thread Mutation Ledger + isolated worktrees)

Change ownership in the chat diff is not derived from a generic `git status` or a `diff(threadBaseline, workingTree)`. It is derived from a server-side **Thread Mutation Ledger** keyed by `threadId`. Checkpoints are hidden git refs (see `docs/internals/glossary.md`).

Three separately-stored artifacts:

1. **Turn Mutation History** — chronological log per turn. Already exists as `WorkLogEntry` at `apps/web/src/session-logic.ts:74-100`. Keep as-is. This is *activity*, not the current diff.
2. **Per-Turn Diff** — `turnDiff = diff(previousTurnCheckpoint, turnCheckpoint)`. Checkpoints are the hidden git refs written at turn boundaries.
3. **Chat Current Diff** — `chatDiff = diff(threadBaseline, latestThreadCheckpoint)`, then **filtered through the ledger** for ownership. The thread baseline is a hidden git ref captured at thread start.

#### Why a baseline diff alone is wrong

A prior draft proposed `chatDiff.files = union of all turnDiff.files` (summing additions/deletions). **Rejected** — that is activity history, not the current state. Counter-example: Turn 1 adds +100 lines to `A.ts`; Turn 2 deletes the same 100 lines from `A.ts`. The union/sum reports `A.ts` as changed with `+100 -100`; the actual chat diff relative to baseline is empty. The user would see a phantom file change in the "files changed" panel that does not exist in their worktree.

Even `chatDiff = diff(threadBaseline, latestThreadCheckpoint)` is wrong when two chats share a working tree. Counter-example:

```
12:00 Chat B starts. B's baseline = HEAD.
12:01 Chat A (concurrent) changes X.ts in the same worktree.
12:02 Chat B changes Y.ts in the same worktree.
```

B's `diff(B_baseline, current_workspace)` includes both `X.ts` and `Y.ts` — but B only owns `Y.ts`. The baseline diff cannot tell us which chat owns which file.

#### The fix: Thread Mutation Ledger

Server-side ledger, fed by provider-reported file changes, RUNE's own `apply_patch` reactor, and checkpoint evidence (git ref tree hash). Stored in `apps/server/src/orchestration/ThreadMutationLedger.ts` (NEW; Effect service). The contract lives at `packages/contracts/src/threadMutation.ts` (NEW):

```ts
type ThreadMutationLedgerEntry = {
  threadId: string;
  turnId: string;
  operationId: string;
  file: string;
  beforeHash: string;
  afterHash: string;
  patch?: string;
  checkpointRef?: string;
  providerItem?: { kind: "apply_patch" | "edit_file" | "write_file" | "tool_change_file"; toolCallId: string };
  recordedAt: string;
};
```

The ledger is fed by:
- **Provider-reported file changes** — Codex `apply_patch`, Claude `Edit`, Cursor's native edit tool, Grok and OpenCode equivalents. Each provider adapter contributes entries as it consumes its native event stream.
- **RUNE's own `apply_patch` reactor** — when RUNE itself applies a patch (e.g. for a subagent that does not have a native edit tool), the reactor records the entry.
- **Checkpoint evidence** — when a turn checkpoint is written, the git ref's tree hash is diffed against the prior checkpoint and the resulting file list is reconciled against the ledger (catching dropped/merged provider events).

`chatDiff` is then: the set of files in the ledger for this thread, with their latest `beforeHash` / `afterHash`. The diff body is `git diff beforeHash..afterHash` (or the stored `patch`). Additions/deletions are taken from that per-file diff, not summed across turns.

For shared-workspace concurrent writers, the ledger's `recordedAt` order gives ownership. Two threads mutating the same file at the same instant is a real conflict; RUNE surfaces a "shared file mutation" warning, not silent attribution.

#### Isolated worktree per concurrent writer (default)

The recommended default for MVS is an **isolated worktree per thread**:

```
Thread A → worktree A (.rune/worktrees/A)
Thread B → worktree B (.rune/worktrees/B)
```

This is the Codex-class pattern: each thread owns its own working tree, and ownership is unambiguous. Default for new threads: isolated worktree. Settings toggle: `useIsolatedWorktrees: boolean` (default `true`). Schema shape mirrors `planModeEnabled` at `packages/contracts/src/settings.ts:235` — use `Schema.withDecodingDefault(Effect.succeed(true))`. The opt-out is for users who explicitly want shared-workspace collaboration (rare; requires the ledger's ownership + warning flow to be sound).

The ledger still runs in both modes — it is the audit trail. With isolated worktrees, the ledger is the per-worktree tree diff (reconciliation against checkpoint evidence is straightforward). With shared workspace, the ledger is the dedupe + ownership resolver that turns an ambiguous baseline diff into a per-thread attribution.

## 3. Composer (one card on the page)

The composer shell is one rounded surface. The `chat-composer-glass-shell` host at `ChatView.tsx:7550-7560` is replaced by:

```tsx
<aside
  className="rounded-2xl border border-border/40 bg-card/70 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.35)] backdrop-blur-md p-3 sm:p-4 mx-auto max-w-3xl"
  data-chat-composer-surface
>
  <GoalField shared={shared} />                              {/* §4 */}
  <form data-chat-composer-form>
    <ComposerPromptEditor ... />                            {/* ChatComposer.tsx:1989-1994 */}
    <ComposerPromptQueue shared={shared} />                 {/* §5 */}
    <footer data-chat-composer-footer>
      <ComposerAttachmentCapability ... />                  {/* ChatComposer.tsx:3822 */}
      <ToolbarButtons ... />
    </footer>
  </form>
</aside>
```

- `data-chat-composer-form` (`ChatComposer.tsx:1989-1994`), `data-chat-composer-goal` (`ChatComposer.tsx:3243-3262`), `data-chat-composer-footer` (`ChatComposer.tsx:3791-3825`), and the `data-queue-item-id` slot (`ComposerPromptQueue.tsx`) stay.
- The shell is liquid-glass per the dashboard shell spec.
- The "Currently powering" / "Used N× today" / "Top X" decorations that floated outside the composer are **rejected**.
- `ChatComposer.tsx:2842-2896` (slash menu), `ChatComposer.tsx:1141-1145` (form structure), `ChatComposer.tsx:1262-1330` (form binding), and `ChatComposer.tsx:1331-1332` (form submit) keep their role and behavior.
- The attachment paperclip (`ChatComposer.tsx:3802`) and the `ComposerAttachmentCapability` upload chip (`ChatComposer.tsx:3822`) stay at the bottom of the card.

## 4. Goal (composerGoal) — integrated with the composer

`apps/web/src/components/chat/GoalField.tsx` (NEW) lives at the top of the composer shell (§3), not in the timeline. It is the only place the active goal is shown.

- `parseComposerGoalCommand` (`composerGoal.ts:1-22`) stays. `set | clear | status | empty` continue to work.
- The slash menu item `/goal` (wired through `composer-logic.ts:271-281` and `ComposerCommandMenu.tsx`) stays.
- The send-time parse at `ChatView.tsx:5601-5638` is **folded into the slash-command taxonomy** (single parse; PR 10). `parseComposerGoalCommand` runs in `parseStandaloneComposerSlashCommand` (`composer-logic.ts`) like `/plan` and `/default`.
- The `data-chat-composer-goal` slot at `ChatComposer.tsx:3243-3262` is re-skinned: a small `RuneMark` "active brief" stamp + a clear button + an edit popover. The active goal renders `formatGoalAwarePrompt` (`composerGoal.ts`) inside the popover, not in the timeline.
- The localStorage key `rune:thread-goal:${goalScopeId}` at `ChatView.tsx:1700-1710` moves to `apps/web/src/state/threadGoalStore.ts` (NEW; mirrors the existing `composerDraftStore` pattern) so two windows on the same thread don't drift.
- The "Active goal" banner inside the timeline is **removed**. The goal only lives in the composer.

## 5. Prompt queue (layered stack, inside the composer)

`apps/web/src/components/chat/ComposerPromptQueue.tsx:1-179` is the card-per-item stack under the textarea.

- The wrapper is the composer shell (§3). Each item is a card with a stamped `Zap` "Queued" header.
- Items render with `translate-y-px` between consecutive items, a 1px separator between items, and slightly-dimmer opacity for items further back in the queue (depth via opacity, not rotation). The most recent item is "on top" via z-index stacking. **No `rotate`**. The paper-feel metaphor was rejected for message rows; the queue is no exception.
- The `GripVerticalIcon` (`ComposerPromptQueue.tsx:68`) becomes a real drag handle using `@dnd-kit` (already in the repo per `useComposerPathSearch` patterns).
- Keyboard nav: rows wrapped in `role="listbox"` with `aria-activedescendant`, Up/Down/Home/End move the active descendant, Enter triggers "steer now".
- Status labels (Running / Steering next / Waiting · FIFO) stay as icon+text.
- Queue callbacks wired in `ChatView.tsx:6396-6471` (`editQueuedPrompt`, `removeQueuedPrompt`, `reorderQueuedPrompt`, `restore-queued`, `steerQueuedPrompt`) stay.
- `data-queue-item-id` on each row stays.

## 6. Code blocks (inset within the assistant canvas)

`ChatMarkdown.tsx:1856` and the fenced-code block at `:1868-1869` are wrapped in a small inset card. The wrapper reads as part of the canvas, not a card stacked on a card.

- `apps/web/src/components/chat/CodeBlockCard.tsx` (NEW) is the fenced-code wrapper. Header bar with `language pill` + `copy button`. `<pre>` body inside.
- Lives inside `ChatMarkdown`, not outside it. The `AssistantTimelineRow` canvas doesn't grow a new card level — the code block is the only inset.
- Today's `<pre>` shape at `ChatMarkdown.tsx:1868-1869` is preserved; the wrapper adds the header bar and the radius.

## 7. Long-message fold (kept)

- The paper-folded bottom at `MessagesTimeline.tsx:1968-2014` (using `WebkitMaskImage`) is kept on the user card (§2.1).
- The user bubble gets a small notch at the bottom-right when folded.
- The fold is a CSS-only effect; no JS state is required to expand.

## 8. Agent chat (`AgentChatPanel.tsx`)

- The "Assigned Mission" header (`AgentChatPanel.tsx:189-199`, `:217-260`) is its own small header above the transcript — the same `model · provider · $cost` line as `AssistantHeader` (§2.2).
- The transcript uses the same `UserTimelineRow` + `AssistantTimelineRow` shapes from §2. **No separate `MessageCard` for the agent chat.** Per AGENTS.md, the same visual language must work on every surface.
- The "Live Activity & Tool Executions" block (`AgentChatPanel.tsx:264-279`) is **replaced** with `InlineReceiptRow` rows inline in the assistant flow. The block is gone.

## 9. Context menus (`contextMenuFallback.ts`)

- The file is the right-side menu for non-Electron web (`localApi.ts:40` is the only caller). It's cross-cutting utility, not chat code. Stays as-is.
- The only chat-surface change: when the chat row's right-click menu is shown via the imperative API, the menu sits in the right z-stack with the row.

## 10. Performance

- `useStableRows` (`MessagesTimeline.tsx:2254`) stays.
- `ChatMarkdown` and `MessageBody` get a memo keyed at message-id level (not row-key), so unchanged messages never re-render the markdown body.
- The `requestAnimationFrame(handleScroll)` at `MessagesTimeline.tsx:513` is debounced so a 1k-message streaming response doesn't fire 1000 rAFs. The minimap `inView` updates flush in one rAF per `rows.length` change.
- A 1k-message thread profile lands in `apps/web/src/test/perf/chat-timeline.bench.ts`. It asserts main-thread time during a 10-message streaming burst stays under 16ms per frame on a 6× CPU-throttled profile.

## 11. Animation policy

AGENTS.md says: "No continuously repainting animations; they peg the GPU on high-refresh displays." The chat currently has:

- `working-spin` (`MessagesTimeline.tsx:1390`): CSS keyframe, runs continuously. **Step** (opacity step), not transform tween.
- `working-dots` (`MessagesTimeline.tsx:1410`): same fix.
- `live-activity-focus-counter` (`MessagesTimeline.tsx:1560-1565`): per-frame animated transform. **Audit and convert to a discrete state on user interaction.**
- `assistant-live-caret` (`MessagesTimeline.tsx:1214-1218`): a static 2px bar. Replace with a 6×6 dot that opacity-steps 1→0.4 while streaming, attached to the end of the last sentence via `data-streaming` on the `AssistantTimelineRow`. Respects `prefers-reduced-motion`.
- `RunePageTransition` blur (in the dashboard shell spec PR 1).
- `RuneLoader` 2s cap (in the dashboard shell spec PR 1).

A `prefers-reduced-motion` rule is added to `index.css` that zeroes the step animations and the streaming caret pulse.

## 12. Per-message cost data (the missing piece)

The current `context-window.updated` activity carries `ThreadTokenUsageSnapshot` without `costUsd` (`packages/contracts/src/providerRuntime.ts:316`). The usage spec adds `costUsd?: number` and `cacheSavingsUsd?: number` to the snapshot, server-side, by hoisting the rate table into a `RateTableService` shared by `ProviderRuntimeIngestion` and `UsageService`. With that, the `AssistantHeader` (§2.2) shows `$0.0123` as a live chip.

The MVS slice lands without the per-message cost; the `AssistantHeader` shows the model + provider without the cost. The cost chip lights up when the rate-table hoist ships (usage spec PR 3).

`RuntimeTaskUsage` (`packages/contracts/src/providerRuntime.ts:526-535`) and the task-event usage payload (`:672-710`) feed the same `costUsd` into the `SubagentRow` (§2.4) and into the `ContextWindowMeter` (`apps/web/src/components/chat/ContextWindowMeter.tsx:1-140`), which gains a "Total cost" row.

## 13. Files in scope

- `apps/web/src/components/ChatView.tsx` (page shell, 7,923 LoC; the `data-chat-composer-*` slots and the `RunePageTransition` boundary stay; the `chat-composer-glass-shell` wrapper at `ChatView.tsx:7550-7560` is replaced by the new card wrapper).
- `apps/web/src/components/agent-chat/AgentChatPanel.tsx` (335 LoC; §8).
- `apps/web/src/components/chat/ChatComposer.tsx` (3,979 LoC; goal banner at 3243-3262 becomes an integrated composer-top field; the shell becomes the card from §3).
- `apps/web/src/components/chat/ComposerPromptQueue.tsx` (179 LoC; paper-stack, kept; §5).
- `apps/web/src/components/chat/MessagesTimeline.tsx` (3,020 LoC; the open-canvas assistant row, the inline receipts, the subagent row).
- `apps/web/src/components/chat/MessagesTimeline.logic.ts` (`deriveMessagesTimelineRows` at :776, `computeStableMessagesTimelineRows` at :1209; new kinds: `inline-receipt`, `subagent`).
- `apps/web/src/components/RuneMark.tsx` (38 LoC; gains `tone` and `size="xs"` props for the "active brief" stamp).
- `apps/web/src/composer-logic.ts` (293 LoC; fold `/goal` into the slash-command taxonomy).
- `apps/web/src/composerGoal.ts` (22 LoC; unchanged; folded in a follow-up).
- `apps/web/src/composerGoal.test.ts` (25 LoC; unchanged).
- `apps/web/src/session-logic.ts` (2,011 LoC; unchanged).
- `apps/web/src/contextMenuFallback.ts` (475 LoC; unchanged).
- `apps/web/src/state/threadGoalStore.ts` (NEW; mirror `composerDraftStore`).

New files:

- `apps/web/src/components/chat/InlineReceiptRow.tsx` (one-line receipt; §2.3).
- `apps/web/src/components/chat/SubagentRow.tsx` (collaborator row; §2.4).
- `apps/web/src/components/chat/ChildThreadRail.tsx` (NEW; the right-rail live child thread surface; §2.4.1).
- `apps/web/src/components/chat/AssistantHeader.tsx` (small `model · provider · $cost` line; no card; §2.2).
- `apps/web/src/components/chat/AssistantFooter.tsx` (small `timestamp · copy · regenerate`; no card; §2.2).
- `apps/web/src/components/chat/CodeBlockCard.tsx` (fenced-code wrapper; part of `ChatMarkdown`; §6).
- `apps/web/src/components/chat/GoalField.tsx` (composer-top goal field; integrated; §4).
- `apps/web/src/state/threadGoalStore.ts` (mirror `composerDraftStore`; §4).
- `apps/server/src/orchestration/ThreadMutationLedger.ts` (NEW; Effect service, §2.6).
- `packages/contracts/src/threadMutation.ts` (NEW; `ThreadMutationLedgerEntry` schema, §2.6).
- `packages/contracts/src/settings.ts:235` (extended; adds `useIsolatedWorktrees: Schema.Boolean.pipe(Schema.withDecodingDefault(Effect.succeed(true)))`; mirrors `planModeEnabled`; §2.6).

Extended files:

- `apps/web/src/rightPanelStore.ts` (extended; adds `selectedChildThreadId: string | null` per thread key in `byThreadKey: Record<string, ThreadRightPanelState>`; §2.4.1).

## 14. PR breakdown

| # | Title | What ships |
|---|---|---|
| 1 | `feat(chat): open-canvas assistant row + small header/footer` | `MessagesTimeline.tsx:1198-1244` becomes an open canvas. The wrapping `<div className="rounded-2xl bg-message p-3 …">` is deleted for the assistant body. `AssistantHeader` + `AssistantFooter` are extracted. |
| 2a | `feat(chat): inline receipts in the assistant flow` | `InlineReceiptRow` (one-line receipts, native `<details>` collapse). The `AgentChatPanel.tsx:264-279` "Live Activity & Tool Executions" block is replaced. |
| 2b | `feat(chat): subagent click → live child thread in the right rail` | `SubagentRow` shows a small disclosure and routes the click to the right rail. The previous inline-transcript expansion is removed. `ChildThreadRail` is added as the right-rail surface. `rightPanelStore` is extended with `selectedChildThreadId: string | null` per thread key. The rail's `Agents` tab gains a child-thread sub-state. |
| 3 | `feat(chat): composer as a card on the page` | New `<aside>` wrapper (§3) + layered queue with `translate-y-px` + 1px separators + dimmer opacity for items further back (NO `rotate`; §5) + paperclip + image attachment paper. The `chat-composer-glass-shell` host is replaced. |
| 4 | `feat(chat): goal as a composer-top field` | `GoalField.tsx` lives in the composer. The `data-chat-composer-goal` slot is re-skinned. The `rune:thread-goal:*` localStorage key moves to `threadGoalStore`. The timeline goal banner is deleted. |
| 5 | `feat(chat): code block inset card + language pill + copy` | `ChatMarkdown` fenced-code wrapper. |
| 6 | `feat(chat): per-message cost chip in assistant header` (depends on usage spec PR 3) | `costUsd` on `ThreadTokenUsageSnapshot` lands; `AssistantHeader` shows `$0.0123`. |
| 7 | `perf(chat): memo at message-id level + rAF debounce on minimap` | The 1k-message stress test asserts main-thread time. |
| 8 | `feat(chat): keyboard nav for the queue` | `role="listbox"`, `aria-activedescendant`, dnd-kit drag handle. |
| 9 | `chore(chat): drop continuous animations, add prefers-reduced-motion` | Step animations; caret pulse; `RuneLoader` cap (cross-ref dashboard spec). |
| 10 | `feat(chat): fold /goal into slash-command taxonomy` | Single parse; remove send-time re-parse. |
| A | `feat(chat): Thread Mutation Ledger + per-checkpoint diffs` | New `apps/server/src/orchestration/ThreadMutationLedger.ts` (Effect service) + `packages/contracts/src/threadMutation.ts` (`ThreadMutationLedgerEntry` schema). Each provider adapter contributes entries (Codex `apply_patch`, Claude `Edit`, Cursor native edit, etc.); the server's own `apply_patch` reactor contributes too; checkpoint evidence reconciles. `chatDiff` derivation switches from "union of turnDiffs" to `diff(threadBaseline, latestThreadCheckpoint)` filtered through the ledger, with per-file `git diff beforeHash..afterHash` for the diff body. |
| B | `feat(chat): isolated worktree per concurrent writer (default)` | Adds `useIsolatedWorktrees: boolean` (default `true`) at `packages/contracts/src/settings.ts:235` (mirroring `planModeEnabled`). Each new thread spawns into its own worktree (`.rune/worktrees/<threadId>`). With isolated worktrees, the ledger is just the per-worktree tree diff; the ownership question becomes trivial. |
| C | `feat(chat): shared-workspace attribution via ledger` | For users who opt out of `useIsolatedWorktrees` (shared workspace), the ledger provides per-thread ownership by `recordedAt` order. Two threads mutating the same file at the same instant surface a "shared file mutation" warning instead of silent attribution. The server-issued Lamport-style sequence (open question 16.6) replaces wall-clock for ledger ordering. |

## 15. Severity-1 findings

Carried over from the prior review:

1. **No model + cost header on assistant messages** (`MessagesTimeline.tsx:1198-1244`) — PR 1 (model), PR 6 (cost).
2. **Prompt queue is a flat list, no paper-stack affordance** (`ComposerPromptQueue.tsx:28-48`) — PR 3.
3. **`composerGoal` is wired but invisible in the timeline** (`ChatView.tsx:5601-5638`, `ChatComposer.tsx:1271-1280`) — PR 4.
4. **`AgentChatPanel` does not share the main chat visual language** (`AgentChatPanel.tsx:217-260`) — PR 1 + PR 2.
5. **Composer is a flat horizontal form, not a card on the page** (`ChatComposer.tsx:3197-3789`) — PR 3.
6. **The assistant body would be wrapped in a card** (proposed in the prior spec) — **rejected**. The assistant body is an open canvas (§2.2).

New in this revision:

7. **`working-spin` + `working-dots` are transform tweens** (`MessagesTimeline.tsx:1390`, `:1410`) — PR 9.
8. **`assistant-live-caret` is a static 2px bar** (`MessagesTimeline.tsx:1214-1218`) — PR 9.
9. **No `prefers-reduced-motion` rule** — PR 9.
10. **The per-message `costUsd` is not rendered anywhere** (`packages/contracts/src/providerRuntime.ts:316`) — PR 6.
11. **The `Live Activity & Tool Executions` block in `AgentChatPanel` is a card, not an inline rail** (`AgentChatPanel.tsx:264-279`) — PR 2.
12. **The "Active goal" banner in the timeline is duplicated with the composer's goal field** (`ChatComposer.tsx:3243-3262`) — PR 4.
13. **`localStorage` key is per-thread, not in the thread store, so two windows on the same thread drift** (`ChatView.tsx:1700-1710`) — PR 4.
14. **Subagent click opens a frozen transcript inline** (regression in the prior spec, §2.4) — regresses the Codex-class live child thread UX. Open the live child thread in the right rail (`ChildThreadRail`); the parent remains visible. The `SubagentRow` becomes a disclosure (`3 files · 6m · Running tests`) that routes to the rail. `rightPanelStore` gains `selectedChildThreadId`. — PR 2b.
15. **Queue items use `rotate-[-0.3deg]` paper-stack gimmick** (proposed in the prior spec, §5) — **rejected**. The paper-feel metaphor was rejected for message rows; the queue is no exception. Use 2px `translate-y-px` offsets, 1px separators, and dimmer opacity for items further back. No `rotate`. — PR 3.
16. **`chatDiff = union of all turnDiffs` is wrong.** Counter-example: Turn 1 +100 lines in `A.ts`, Turn 2 -100 lines in `A.ts`. Union/sum reports `A.ts` as changed with `+100 -100`; the actual chat diff relative to baseline is empty. That is activity history, not the current state. Replace with `diff(threadBaseline, latestThreadCheckpoint)` plus the Thread Mutation Ledger (§2.6) for ownership. — PR A.
17. **Shared-workspace concurrent writers cannot be attributed from a baseline diff alone.** Two chats mutating the same worktree at the same time silently steal each other's edits — `diff(B_baseline, current_workspace)` includes both threads' changes, with no way to tell who owns what. Default to isolated worktrees; the ledger provides audit + ownership in both modes (§2.6). — PR A + PR B + PR C.

## 16. Open questions

1. **The "open canvas" assistant: full-width or max-width?** Recommend full-width with a `max-w-3xl mx-auto` (same as composer) for readability. A `max-w-prose` is too narrow for code blocks; full-bleed is too wide for prose. `max-w-3xl` is the smallest model that makes both readable.
2. **The subagent transcript expansion: live or frozen at click time?** Resolved — **live, in the right rail, not inline**. The frozen-inline-transcript pattern was rejected. The right rail is the canonical Codex-class inspection surface for child threads. The row is a disclosure, not a transcript host.
3. **The inline receipt collapse: `<details>` (no JS) or controlled state?** Recommend `<details>` for MVS — the receipt is an annotation, not a control. A controlled state is a follow-up if we need "expand all" / "collapse all" later.
4. **The right rail's child thread mode: when the user clicks a subagent, does the rail auto-switch to the `Agents` tab, or stay on whatever tab they last viewed?** Recommend **auto-switch** for the MVS — when a `SubagentRow` is clicked, the rail opens (if closed) and switches to the `Agents` tab with the child thread selected. User preference (always-stay-on-last-tab vs. auto-switch) is a follow-up.
5. **Subagent follow-ups: when the user types in the rail's composer, does the message land in the child thread's main timeline, or in a side channel?** Recommend **the child thread's main timeline** — this is the canonical Codex-class behavior. A side channel would be a regression (extra surface, extra model state, harder to follow what the agent saw).
6. **Isolated worktrees have a cost: each worktree holds its own dependency install.** For monorepos cheap; for large polyglot repos the user may want to opt out. `useIsolatedWorktrees` (default `true`) is the opt-out. There is no per-thread auto-clean — worktrees persist for the thread's lifetime, which is fine because the thread is the unit of organization. If a user wants to reclaim disk, they delete the thread.
7. **Ledger write contention: two threads attempting a ledger entry for the same file at the same instant.** Use a server-issued Lamport-style sequence, not wall-clock. The ledger is the audit trail; a tie on `recordedAt` must be broken deterministically by sequence number, not by clock skew between machines. RUNE's server is the single sequence issuer; clients (mobile, web, desktop) do not write the sequence.

## 17. Out of scope

- The provider adapter, server-side rate pricing (covered in the usage spec), the dashboard shell (its own spec), settings (its own spec), the skills system (its own spec), mobile, the database, the contracts beyond `costUsd` on `ThreadTokenUsageSnapshot` + `RuntimeTaskUsage` (which is in the usage spec).
- The `MessageCard` wrapper design (rejected).
- The paper-stack metaphor for message rows (rejected).
- The four-message-row card grid (rejected).
- The goal-as-sticky-paper-above (rejected; the goal lives in the composer).
- The "decorative 4-status-segment" pattern (rejected).
