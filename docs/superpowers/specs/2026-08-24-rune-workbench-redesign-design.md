# RUNE Workbench Redesign

## Status

Approved direction, pending implementation planning.

## Summary

RUNE will become a distinct desktop and web workbench for coding agents rather than a rebranded T3 Code shell. The redesign keeps the existing event-driven runtime, provider sessions, Ghostty terminal, right-panel surfaces, and remote connection model, while replacing the visual language and information architecture around a RUNE-specific concept: a calm, high-signal workbench that makes the current project, agent, model, and execution state obvious.

The visual foundation is graphite and ink with a controlled violet/plum brand accent. Copper/amber is reserved for active execution, attention, and runtime progress. The system takes inspiration from ElevenLabs' calm hierarchy, Apple's restraint and polish, and Samsung's adaptive surface depth as principles only; it does not reproduce their branding, assets, or layouts.

The scope is web and desktop. Mobile is explicitly out of scope for this redesign.

## Problem

The current product still communicates T3 Code in several places: the blue stage artwork, topbar treatment, sidebar hierarchy, composer geometry, and settings information architecture. RUNE branding alone does not create a new product identity. The current UI also spreads related controls across dense surfaces, making provider selection, execution state, terminal context, and project tooling harder to understand than they need to be.

The requested redesign has to solve four things together:

1. Make RUNE visibly and behaviorally distinct from T3 Code.
2. Make high-frequency work—choosing a provider/model, composing a request, watching execution, and using the terminal—feel coherent.
3. Make provider subscriptions, API connections, models, skills, and future plugins understandable without presenting controls that the backend cannot honor.
4. Preserve the performance, remote-ready behavior, desktop integration, accessibility, and state durability that already exist.

## Goals

- Establish a RUNE-owned visual system for light and dark themes.
- Remove the blue/grid T3-like topbar artwork and replace it with quiet, purposeful RUNE chrome.
- Create a consistent motion language for navigation, right-panel toggles, terminal drawers, dialogs, and state changes.
- Improve the chat composer without hiding essential controls or breaking keyboard workflows.
- Make the right panel and terminal feel like first-class workspace surfaces.
- Reorganize provider settings around subscriptions, API connections, environments, and model management.
- Reuse the existing provider-instance, model-preference, and provider-snapshot contracts wherever they are sufficient.
- Add real API-provider support for OpenAI API and OpenRouter through server-side provider adapters rather than UI-only entries.
- Add a skills inventory that reflects actual server-discovered skills and their scope.
- Design and implement a permissioned plugin model with explicit project and user scopes; do not simulate installation with local-only UI state.
- Make the shared web UI flow through the desktop shell with desktop-specific titlebar and IPC behavior intact.
- Leave mobile source and navigation unchanged.

## Non-goals

- Rebuilding the orchestration/event-sourced server.
- Replacing Ghostty or the existing terminal session runtime.
- Replacing the existing provider adapters that already work.
- Copying T3 Code, ElevenLabs, Apple, or Samsung visual assets or exact layouts.
- Introducing continuously repainting ambient animations, animated gradients, or decorative motion.
- Building a marketplace or remote plugin distribution service in the first visual slice.
- Changing mobile UI, React Native navigation, or mobile contracts unless a later explicitly scoped task requires it.

## Product principles

### Calm signal density

RUNE should feel quiet at rest and precise under activity. Surfaces use a small number of semantic levels, typography does most of the hierarchy work, and color is reserved for action, identity, and state.

### Runtime truth over decoration

Provider health, model availability, active work, approvals, terminal processes, and plugin permissions must be derived from real state. A polished empty state is acceptable; a decorative status that is not backed by runtime data is not.

### Context follows the work

Project, thread, branch, provider, model, terminal, and skills should remain connected. A control should show what scope it affects and should not silently change the user's global configuration when the user intended a project change.

### Progressive disclosure

The primary workspace stays compact. Advanced provider fields, model policies, plugin permissions, and diagnostic information open in focused panels or detail views with clear summaries.

### Motion communicates causality

Motion should explain where a surface came from, what changed, and what remains available. It should never delay a command or require the user to watch an animation.

## Visual system

### Color roles

The implementation will extend the existing semantic theme-token seam rather than scattering literal colors through components.

Core roles:

- `background`: deepest ink/graphite workspace canvas.
- `surface`: sidebar and primary chrome surface.
- `surface-raised`: composer, panel, dialog, and elevated controls.
- `surface-subtle`: hover, selected-row, and quiet grouping surfaces.
- `border`: low-contrast structural boundary.
- `foreground`: primary text.
- `muted-foreground`: supporting labels and metadata.
- `primary`: RUNE violet/plum action and focus color.
- `primary-foreground`: readable text on violet controls.
- `accent`: low-intensity violet tint for selection and active navigation.
- `runtime`: copper/amber for working, queued, and attention states.
- `success`, `warning`, `error`, `info`: semantic state colors independent from the brand color.

Violet is the brand signal, not a universal decoration. Runtime state must remain distinguishable in monochrome and for users with color-vision differences through labels, icons, and shape.

### Theme modes

Both light and dark themes use the same semantic roles and geometry. They differ in contrast, elevation, and surface mixing rather than in layout.

- Dark: near-black ink, charcoal raised surfaces, restrained violet edge/focus light, copper activity signals.
- Light: cool graphite text, warm-neutral paper surfaces, plum controls, soft structural borders.
- High contrast: remove low-opacity decorative layers, strengthen boundaries and focus rings, preserve state labels.

The existing stage-artwork selector should no longer be the primary RUNE identity treatment. If environment identification artwork remains available as an optional user setting, it must be visually separate from the default RUNE shell and must not recolor controls or reduce contrast.

### Typography

- Use the existing sans token for interface text with tighter tracking on page titles and relaxed line-height for explanations.
- Use the existing mono token for model ids, branches, paths, terminal labels, environment names, and runtime metadata.
- Use weight and spacing before color to establish hierarchy.
- Avoid all-caps labels except short metadata or compact status badges.

### Shape and depth

- Use compact control radii and modest panel radii.
- Reserve larger radii for the composer and primary empty-state surfaces.
- Prefer one clear border plus a restrained shadow over stacked translucent cards.
- Avoid generic glass everywhere. Use translucency only where it clarifies layering over a moving or scrolling surface.

## Shell and navigation

### Workspace shell

The shared shell remains rooted in `AppSidebarLayout`, the shared sidebar primitives, and `WorkspacePageHeader`. The redesign changes their visual contract, not the remote/session boundaries.

The shell has four layers:

1. RUNE mark and workspace switcher.
2. Project and thread navigator.
3. Contextual workspace surface, such as chat, settings, usage, or pull requests.
4. Utility rail for settings, usage, connections, skills, plugins, and account/environment actions.

The shell should make the active scope visible: global, project, or thread. The scope appears as text and metadata, not only as a color change.

### Sidebar

The default sidebar should be a structured navigator, not a list of unrelated rows.

- Header: RUNE mark, current environment, and optional compact connection state.
- Search: global workspace search with shortcut affordance.
- Projects: project rows with thread counts and active status.
- Threads: recent, working, snoozed, and settled groups with improved row hierarchy.
- Context rail: Skills, Plugins, Usage, Settings, and Connections.
- Footer: connection state, updates, and account actions.

Existing thread sorting, settled/snoozed behavior, drag ordering, keyboard navigation, and terminal indicators must remain functional. The redesign should modify shared row primitives and tokens rather than duplicating the sidebar.

### Topbar

Remove the current blue/grid stage treatment from the default topbar. The replacement is a quiet command rail:

- Left: project/thread breadcrumb with branch or environment context.
- Center: available space for thread title or contextual action state.
- Right: panel toggles, project actions, and desktop-native controls.
- Active work: a small violet/copper state mark and text/tooltip; no decorative pulsing field.

Topbar geometry must continue to use the shared workspace variables and desktop titlebar environment values.

### Page transitions

Settings, usage, skills, plugins, and project pages use a shared page transition contract:

- Exit/enter opacity and a short vertical displacement of approximately 4–8px.
- No full-page zoom, bouncing, or route-blocking animation.
- Preserve scroll position when navigating within a section where appropriate.
- Respect `prefers-reduced-motion` by switching to an immediate state change.

## Composer

The composer becomes the primary RUNE command surface while retaining the current `ChatComposer`, prompt editor, draft store, provider/model selection, attachments, approvals, tasks, and terminal-context integration.

### Structure

1. Prompt canvas: clear writing area with a quieter border and strong focus state.
2. Context tray: files, images, terminal selections, skills, and pending context.
3. Execution tray: provider instance, model, reasoning/interaction mode, runtime access, and environment.
4. Primary action: send, interrupt, or continue, with state-specific label and keyboard hint.
5. Expandable detail: plan, approval, input, and task progress surfaces.

### Behavior

- The composer uses a single clear visual anchor in both empty and active threads.
- Provider/model selection is summarized in one compact control but opens to a richer picker with favorites and capability details.
- Context items can be removed individually and show their scope.
- Advanced controls collapse based on available width, not by deleting capabilities.
- Pending approvals and user-input requests replace the send action with a clear action state.
- Dropped files, terminal context, skills, and slash commands retain their current real integrations.
- Focus is restored after panel toggles and route transitions.

### Motion

- Control groups expand/collapse with height and opacity transitions.
- Context chips enter with a short fade/translate and exit without shifting unrelated controls more than necessary.
- Do not animate the full prompt editor on every keystroke.
- Keep editor content mounted when opening menus and detail trays.

## Right panel and terminal

### Right panel

The existing right-panel surface model remains the source of truth for files, diffs, previews, pull requests, agents, and terminals.

- Opening the panel animates the layout boundary and content opacity together.
- Closing reverses the same path and returns focus to the invoking control or previous surface.
- On narrow desktop/web widths, the panel becomes an overlay sheet using the existing media-query boundary.
- The active tab remains stable during animation; content does not flash or reinitialize unnecessarily.
- Maximize/restore is an explicit layout state with the same transition language.
- Live-agent badges remain semantic and are not the only indication of activity.

The implementation should use transform/opacity or compositor-friendly layout strategies where possible, avoid repeated resize observers that repaint the entire app, and preserve existing surface state.

### Console/terminal

The existing `ThreadTerminalDrawer`, Ghostty surface, and terminal UI store will be styled and composed as a RUNE Console.

- Bottom drawer: clear console title, active session, process state, and layout controls.
- Tabs: session label, cwd/project context, running state, and close action.
- Splits: retain horizontal and vertical split behavior with clearer active focus.
- Selection actions: add to chat and copy remain prominent, paste remains available through context menu.
- Terminal theme derives from semantic RUNE tokens and remains readable in both themes.
- Open, close, resize, split, and focus changes animate without recreating the terminal surface.

## Providers, API connections, and models

### Settings information architecture

Provider settings should be reorganized into an account-like connection workspace:

- Connections: all provider instances and environments.
- Subscriptions: IDE/provider CLI instances such as Codex, Claude, Cursor, Grok, and OpenCode.
- API endpoints: OpenAI API, OpenRouter, and future OpenAI-compatible endpoints.
- Models: discovered, custom, hidden, ordered, and favorite models.
- Defaults: global and project-level provider/model defaults.
- Diagnostics: health checks, capabilities, and environment-specific access.

The existing environment selection and access-gating behavior stays intact. The page may be visually redesigned, but a browser session must not receive capabilities it has not been granted.

### Provider instance cards

Each card summarizes:

- Display name and provider type.
- Authentication mode: subscription, local CLI, API key, or remote endpoint.
- Environment(s) where it is available.
- Enabled/disabled state.
- Health and last checked time.
- Default model and model count.
- Scope: global or project default.
- A clear manage action for driver-specific configuration.

The add-provider wizard becomes a two-stage flow: choose connection category/provider, then configure credentials, endpoint, model policy, and scope. Secrets remain in the existing server secret boundary; they must never be persisted as ordinary browser-visible settings.

### API provider support

OpenAI API and OpenRouter require:

- Open provider driver kinds and configuration schemas.
- Secret-store integration for API keys.
- Server-side request adapters with streaming, tool, approval, and error contracts mapped into the existing orchestration model.
- Model discovery or user-defined model configuration with endpoint and capability metadata.
- Focused contract and adapter tests.
- Remote connection behavior that keeps secrets on the execution environment.

If a provider capability is unsupported, the UI must say so and keep the action unavailable rather than silently dropping features.

### Model management

Build on the existing `customModels`, favorites, hidden-model, and model-order settings:

- Search and filter by provider instance and capability.
- Favorite, hide, reorder, and reset models.
- Add custom model ids where the provider adapter supports them.
- Show model source: discovered, custom, or provider default.
- Show capability badges only when backed by provider metadata.
- Allow project defaults to override global defaults with an obvious reset path.

## Skills

The first skills page is an inventory over actual provider snapshots:

- Filter by project, repository, user, app, system, and provider scope.
- Search by name and description.
- Show source path only when it is safe and useful; avoid leaking secrets or unnecessary host details.
- Show enabled/available/provider status.
- Open a focused detail view with description, scope, provider, and usage examples where available.
- Link to composer invocation using the existing slash/skill command path.

Enable/disable and installation controls require a persisted server contract. Until that contract exists for a provider, the UI remains honest and read-only for that capability.

## Plugins

Plugins are a separate product surface from provider-discovered skills. The plugin model is:

```text
Plugin
  identity: id, name, version, description
  scope: project | user
  source: local | repository | managed
  capabilities: tools, commands, skills, filesystem, network, terminal
  state: installed | enabled | disabled | update-available | error
  permissions: explicit grants with review timestamps
```

The first implementation should support local/project and user scopes on the execution environment, with explicit review before enabling capabilities. Project plugins must not affect unrelated projects. User plugins may be visible across projects but should still be able to declare project-specific activation.

The UI needs a real contract for listing, installing, enabling, disabling, updating, and removing plugins. The contract must include environment identity and permission state. No plugin page should claim that a plugin is installed based only on local browser storage.

## Data and contract boundaries

- Shared UI changes live in `apps/web` and are consumed by desktop.
- Provider/API changes cross `packages/contracts`, `apps/server`, and the web client.
- Client-only preferences remain in client settings or scoped UI stores.
- Server-owned secrets remain behind the server secret store.
- Provider/model/skill data comes from real environment snapshots and settings atoms.
- Plugin operations require typed contracts and server enforcement before UI actions are enabled.
- Mobile contracts must not be changed solely to support this redesign.

## Accessibility and performance

- Every interactive control has an accessible name and visible focus treatment.
- Keyboard navigation works for sidebar, settings navigation, provider cards, model lists, tabs, terminal controls, and composer menus.
- Motion has reduced-motion fallbacks and never blocks an action.
- Avoid always-running ambient animations and per-frame layout polling.
- Virtualized thread/message lists remain virtualized.
- Keep Ghostty and provider sessions mounted when only their visual container changes.
- Use compositor-friendly opacity/transform transitions and measure layout only when necessary.
- Verify contrast in both themes and high-contrast mode.

## Phased delivery

### Phase 1: RUNE foundation

- Replace stage artwork default and establish RUNE semantic palette.
- Redesign sidebar chrome, topbar, navigation, settings shell, buttons, menus, and surfaces.
- Add shared motion tokens and reduced-motion behavior.
- Preserve existing functionality and storage keys.

### Phase 2: Workbench interaction

- Redesign composer.
- Animate right-panel open/close, maximize/restore, and terminal drawer transitions.
- Restyle Console tabs/splits and terminal context actions.
- Verify focus, keyboard shortcuts, and real thread/terminal states.

### Phase 3: Provider and model workspace

- Redesign provider settings using existing provider-instance and model contracts.
- Add better subscription/API separation and model management UI.
- Implement OpenAI API/OpenRouter server contracts and adapters with focused tests.

### Phase 4: Skills and plugins

- Add skills inventory and detail view from real provider snapshots.
- Add typed plugin inventory and scope model.
- Add permission review and operations only when backed by server enforcement.

### Phase 5: Verification and handoff

- Run focused unit/type checks and web build.
- Run one integrated web pass against the isolated development environment.
- Verify desktop inherits the shared redesign and retains titlebar/IPC behavior.
- Produce before/after screenshots for web and desktop surfaces.
- Package the desktop installer only after the native toolchain is available and the artifact path is verified.

## Acceptance criteria

- RUNE no longer presents the blue/grid T3-style default topbar.
- Light and dark themes share a cohesive graphite/ink/violet identity.
- Sidebar, topbar, composer, settings, right panel, and terminal visibly belong to one design system.
- Right panel and terminal transitions are smooth, reversible, keyboard-safe, and reduced-motion aware.
- Existing provider subscriptions and model selection continue to work.
- API connections are only shown as usable when server adapters and secret handling exist.
- Models can be searched, favorited, hidden, ordered, and customized within supported contracts.
- Skills page reflects actual provider/environment state and scopes.
- Plugin actions are scoped and permissioned, never browser-only fiction.
- Web and desktop share the redesign; mobile remains unchanged.
- Focused verification passes with any baseline failures clearly separated from redesign regressions.
