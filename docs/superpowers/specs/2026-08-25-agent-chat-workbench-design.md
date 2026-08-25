# Agent chat and intent-gated workbench design

Date: 2026-08-25

## Product brief

Rune is a multi-surface coding-agent workbench. The user needs to monitor work
spawned from a thread, enter a child agent when it is resumable, and open a
web result only when the user asked for one or deliberately started a dev
server. The workbench should feel like one continuous tool rather than a set
of floating cards.

The approved outcome is:

- a flat, agent-first roster instead of a folder-looking sub-agent branch;
- a chat-like agent detail surface with a real input path for resumable child
  threads;
- a clearer direct-spawn roster and empty launcher;
- an intent-gated web-preview affordance with integrated-browser opening;
- square outer workbench surfaces for the sidebar, chat, terminal, preview,
  and right panel, while small control radii remain available for usability.

The screenshot supplied with the request is visual evidence only. It does not
define data contracts, permissions, responsive behavior, or which states are
valid.

## Repository evidence

The active implementation is the shared web client in `apps/web`, wrapped by
the desktop client. The relevant current seams are:

- `apps/web/src/components/Sidebar.tsx` renders
  `SidebarSubagentBranch` as a nested `Sub-agents` folder, with file-style
  rows that only focus activity in the right panel.
- `apps/web/src/components/AgentsPanel.tsx` renders workflow groups and a
  `Direct spawns` section. Selecting a row opens `AgentActivityDetail`, which
  is an activity preview rather than a conversation composer.
- `packages/client-runtime/src/state/subagentRuntime.ts` folds persisted
  `task.*` activities into the shared agent roster model. It already preserves
  stable identity, status, usage, and recent activity.
- `apps/server/src/provider/Layers/CodexSessionRuntime.ts` recognizes native
  Codex child threads, retains their provider thread IDs and agent paths, and
  currently routes child conversation content into synthetic lifecycle events
  rather than a user-facing transcript.
- `apps/server/src/provider/Layers/CodexAdapter.ts` maps native child events to
  `task.*` activity with `timelineBypass`, which keeps child traffic out of the
  parent timeline but does not provide a sendable child-chat contract.
- `apps/web/src/components/preview/ChatWebPreviewCard.tsx` is mounted above
  the composer and currently renders whenever local server discovery returns a
  live server, subject only to dismissal state.
- `apps/web/src/components/preview/useDiscoveredLocalServers.ts` already
  distinguishes scanner servers from configured servers and records terminal
  attribution, which is sufficient to distinguish deliberate thread-local
  dev-server work from incidental discovery.
- `apps/web/src/components/preview/openDiscoveredPort.ts` and the preview
  bridge already provide the integrated desktop preview path.
- `apps/web/src/index.css`, `ThreadTerminalDrawer.tsx`, `ChatView.tsx`, and
  `PreviewPanelShell.tsx` contain the shared rounded outer-shell styling that
  will be changed at the seams rather than by removing every radius from every
  control.

The worktree contains unrelated settings changes in:

- `apps/web/src/components/settings/ProviderSettingsPanel.tsx`
- `apps/web/src/components/settings/ProviderWorkspace.tsx` (deleted)
- `apps/web/src/components/settings/settingsSearch.ts`
- `apps/web/src/providerInstanceSlots.ts`
- `apps/web/src/providerInstanceSlots.test.ts`

Those changes are outside this feature and must remain untouched.

## Approaches considered

### A. Visual-only activity roster

Replace the folder icon and polish the existing activity detail, but keep all
child work as status-only rows. This is the smallest change, but it cannot
honestly satisfy “enter it and talk to it” because the current provider layer
does not expose child transcript or send operations.

### B. Provider-native child conversation surface (recommended)

Keep the parent thread as the durable Rune thread, expose a scoped resumable
handle for providers that support child conversations, and render the child
conversation inside the Agents surface. Codex native child threads are the
first supported handle because the current runtime already tracks their
provider thread IDs and agent paths. Providers or tasks without a resumable
handle remain visible and useful as activity-only rows with an explicit
explanation.

This preserves parent-thread history and avoids inventing a second permanent
thread hierarchy while still giving the user the Codex-style “enter child,
read, follow up” behavior.

### C. Promote every child into a first-class Rune thread

Create persistent sidebar threads for every spawned task and copy or mirror
provider history into them. This would make navigation superficially simple,
but introduces lifecycle reconciliation, title ownership, retention, search,
permissions, and duplicate-session problems. It is out of scope for the
current request.

## Flow contract

### Agent roster

1. A child agent is created or reconstructed from authoritative server
   activity.
2. The active thread shows an `Agents` section with an agent glyph/avatar and
   status, not a folder/file hierarchy.
3. Selecting an agent focuses the Agents surface and opens its detail view.
4. If a resumable handle exists, the detail view loads the child transcript
   and exposes a compact composer.
5. Sending a follow-up is scoped to the parent thread and child handle. The
   child response updates the detail transcript and roster status without
   polluting the parent chat timeline.
6. Closing or changing focus returns to the roster without stopping the child.
7. Failed, idle, interrupted, and non-resumable children preserve the
   activity view and explain the available recovery action.

### Agent chat

The child chat is a focused operational surface, not a second full app shell.
Its anatomy is:

- identity header: avatar/glyph, title, role/path, status, and close/focus
  action;
- scrollable transcript: user follow-ups, child assistant responses, and
  compact activity/tool markers where useful;
- composer: send, stop/cancel when supported, disabled/submitting states, and
  error recovery;
- footer metadata: provider/model, elapsed time, and token usage.

The transcript uses the existing markdown safety/rendering path. Provider
content is treated as untrusted text; URLs are rendered through the existing
link policy and never inserted as raw HTML.

### Preview card

The composer-adjacent card is hidden by default. It becomes eligible only when
at least one explicit intent is true:

- the current or persisted user request clearly asks for a web link, preview,
  localhost URL, browser opening, or a dev server;
- a configured dev-server URL is live and is associated with the current
  thread's terminal/session;
- the user explicitly opened a preview surface for the current thread.

Incidental scanner-only servers from another process do not make the card
appear. A live server must still pass the existing loopback/discovery
validation before it is offered.

When eligible, the primary action opens the integrated browser in desktop
runtime. The web runtime keeps the existing external-browser fallback and
labels it honestly. Secondary actions copy the resolved link, choose another
live server, or dismiss the current set. Dismissal removes the card until the
live set changes or the user expresses intent again.

### Direct-spawn launcher

The empty right panel becomes an action-oriented list rather than a grid of
large rounded cards. Available surfaces lead with their icon and dominant
action; unavailable surfaces remain visible with a short reason. Keyboard
shortcuts, focus behavior, and the existing surface availability rules stay
intact.

The Agents surface uses the same visual language as the direct-spawn rows, so
the launcher and the active roster feel like one system.

## Data and provider contract

### Shared agent model

Extend the source-neutral runtime model with an optional chat handle rather
than making every task ID implicitly sendable. The handle must identify:

- provider/runtime kind;
- provider child thread identity or equivalent resume cursor;
- parent Rune thread ownership;
- capabilities such as read transcript, send, interrupt, and resume.

The client may display the handle’s capability state, but it cannot authorize
it. The server re-resolves and validates the handle against the active parent
session before every read, send, or interrupt operation.

### Codex child transport

The Codex runtime will retain the already-registered child provider thread
identity and add a narrow child-chat operation. The operation must:

- reject a child that is not registered under the requested parent session;
- reject a child handle from another environment or parent thread;
- use the existing Codex `turn/start` protocol against the child provider
  thread;
- preserve child notifications as child-scoped transcript/activity events;
- keep parent timeline suppression for child traffic;
- return typed failure for a closed, expired, or unavailable child;
- honor the same input-size and attachment constraints as parent turns.

The orchestration boundary should expose this as a scoped command/RPC rather
than allowing the browser to call provider methods directly. The read model
should keep enough child transcript state for a refresh/reconnect, while
remaining bounded by the existing activity/transcript retention rules.

### Unsupported providers and legacy tasks

No fake chat input is shown when a task has no resumable handle. The detail
surface says that the run is observable but not independently resumable, and
offers the parent thread as the legitimate follow-up route. This is an
intentional capability boundary, not a presentation-only restriction.

## Screen and component contract

### Sidebar

Replace the nested folder semantics in `SidebarSubagentBranch` with a flat
agent roster branch owned by the active thread context. Use `Bot`, provider
identity, or an equivalent semantic agent glyph; do not use folder/file icons
for agents. Each row must have:

- accessible name containing title and status;
- status dot and text alternative;
- selected/focused state;
- an action that enters the agent detail surface;
- stable keyboard tab order and no hidden focusable rows when collapsed.

### Agents panel

Refactor `AgentsPanel` into three small units:

1. `AgentsPanelHeader` for summary and current scope;
2. `AgentRoster` for workflows/direct spawns and stable row geometry;
3. `AgentChatPanel` for the focused child transcript and composer.

The roster remains the only source of agent rows. The chat panel is a focused
detail state, not a second roster. Direct spawns get a consistent row with
identity, role, status, activity, usage, and a clear enter affordance.

### Preview

Keep `ChatWebPreviewCard` as the single composer-adjacent component. Move its
visibility decision into a pure, tested selector so live server discovery and
user intent cannot drift apart. Keep opening/link resolution in the existing
browser helpers.

### Workbench shell

Change shared outer shells at these boundaries:

- sidebar inner surface and sidebar stage inset;
- right-panel sheet and embedded panel host;
- terminal drawer/panel containers;
- preview panel outer shell;
- chat composer glass host and chat surface boundary;
- thread/sidebar rows where they currently read as floating cards.

The new default is edge-to-edge surfaces separated by borders, tonal layers,
and spacing. Small-radius controls, status dots, avatars, menus, and compact
chips may retain their own geometry. No gradients or decorative color are
needed for this change; violet remains a restrained focus/selection accent.

## State matrix

| Surface | State | Required behavior |
| --- | --- | --- |
| Agent roster | no agents | Explain that the thread has not spawned agents; keep the launcher/action available. |
| Agent roster | loading/reconnecting | Preserve row geometry and show a truthful loading state; do not claim agents are idle. |
| Agent roster | working/waiting | Show stable identity, status, current activity, and stop/focus affordance where supported. |
| Agent roster | idle | Mark as resumable when a handle exists; offer enter/follow-up. |
| Agent roster | failed/interrupted | Preserve the error/result, offer retry or parent-thread recovery only when supported. |
| Agent detail | loading transcript | Keep identity header visible and show a bounded loading skeleton. |
| Agent detail | ready | Render transcript, activity markers, metadata, and composer. |
| Agent detail | submitting | Disable duplicate send, retain draft, show honest pending state, allow cancellation if supported. |
| Agent detail | send failure | Preserve draft and transcript; show a local retry action and typed failure reason. |
| Agent detail | no chat handle | Render activity-only detail with clear capability explanation; do not render a dead composer. |
| Preview card | default | Hidden even when unrelated local servers are discovered. |
| Preview card | explicit intent + live server | Show the resolved host/port and integrated-browser action. |
| Preview card | no live server | Remain hidden; do not show an empty placeholder above the composer. |
| Preview card | dismissed | Stay hidden for the current live-server signature. |
| Preview card | unsupported runtime | Offer external-browser fallback with accurate label. |
| Shell | narrow/mobile | Keep surfaces edge-to-edge; move right-panel detail into the existing sheet behavior and preserve keyboard/touch targets. |
| Shell | reduced motion | Disable nonessential roster/panel transitions without changing state or focus behavior. |

## Security and trust boundaries

- A browser-visible child handle is not an authorization token. Server-side
  ownership and active-session checks gate every child operation.
- Child transcript content is sanitized through existing markdown/link
  rendering. No provider payload is trusted as HTML or a local file path.
- Preview URLs are resolved through the existing environment-aware loopback
  resolver. The card does not create an arbitrary external navigation target
  from untrusted activity text.
- Provider capability and task status are server-derived. Hiding a composer
  is a UX decision only; the server still rejects unsupported or unauthorized
  commands.
- Existing environment/thread scoping remains part of every query and
  mutation. No global agent roster is introduced.

## Responsive, accessibility, and performance plan

- Test the focused agent panel at narrow mobile, tablet, laptop, and wide
  desktop widths. On narrow layouts the existing right-panel sheet owns the
  width; the chat transcript remains scrollable and the composer remains
  reachable.
- Use semantic buttons/headings, `aria-current`/`aria-pressed` for selected
  agent state, live-region status updates only where needed, and visible
  keyboard focus. Do not make status color the only signal.
- Keep roster row heights fixed. Do not introduce per-second React rerenders;
  reuse the existing DOM-write elapsed timer pattern.
- Keep preview discovery subscribed once per thread and make intent selectors
  pure/memoizable. Avoid polling or continuously repainting animations.
- Preserve logical spacing and directional properties so the roster and chat
  remain viable for future RTL/localized strings.
- The desktop and web clients share the web implementation. The mobile client
  remains on its native navigation in this slice; shared contracts/state must
  remain decodable there, but the desktop right-panel visual redesign is not
  copied into React Native.

## Verification contract

Focused verification after implementation will include:

- unit tests for agent-handle folding, capability states, child-chat routing
  guards, and preview-intent selection;
- component tests for flat sidebar agents, direct-spawn roster states, chat
  transcript/send states, and preview-card visibility/actions;
- focused web typecheck and lint for changed files;
- focused server/provider tests for Codex child send/read/interrupt behavior;
- a targeted build if the changed contracts require it.

No browser/computer-use verification is included without an explicit request
to launch a dev server or inspect the live app. Production readiness still
requires live desktop/web interaction, reconnect, provider, and accessibility
evidence beyond these source-level checks.

## Out of scope

- Creating a permanent global sidebar thread for every child agent.
- Rebuilding provider adapters that do not expose resumable child sessions.
- Changing the mobile navigation design in this desktop-focused slice.
- Replacing the existing integrated browser or port-discovery system.
- Editing unrelated provider-settings work already present in the worktree.

## Success criteria

The change is successful when a user can recognize agents as first-class
workers without mistaking them for files, enter a supported child agent and
send a follow-up through a real chat surface, understand why an unsupported
agent cannot be resumed, avoid unsolicited preview UI from incidental servers,
open an explicitly requested local result in the integrated browser, and see
the sidebar/chat/terminal/right-panel surfaces read as one edge-to-edge
workbench.
