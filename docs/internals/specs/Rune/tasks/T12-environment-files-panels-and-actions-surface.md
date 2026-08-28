---
task_id: T12
title: Environment quick panel, right rail, files, servers, and action surfaces
status: PARTIAL_WITH_EVIDENCE
depends_on: [T00, T10, T11]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T12 — Environment quick panel, right rail, files, servers, and action surfaces

## Purpose

Unify RUNE's IDE-side surfaces around one contextual Environment cockpit and a fast topbar glance popover, with calm file-tree behavior and canonical runtime state.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master sections 51–56 plus authoritative v4 Environment Quick Panel.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


# 51. Right-side panels need one premium RUNE shell

Audit all current right-panel surfaces:

```text
Environment
Files
Diff
Terminal
Browser/Preview
Pull Request
Agents
other current panels
```

They should feel like parts of one professional IDE.

Unify:

```text
header geometry
icon buttons
resizing
close/back behavior
keyboard focus
section spacing
scrollbars
loading state
empty state
error state
motion
liquid-glass treatment
```

Do not put every panel inside a heavy floating card.

The UI must remain dense and useful.

---

---

# 52. Environment Cockpit

Complete the Environment overview described in the existing spec.

Contextual sections:

```text
Changes
Workspace
Actions
Servers
Agent
Agents
Repository
Pull Request
Recap
```

Only show relevant sections.

Do not create ten settings toggles.

Default:

```text
Smart
```

Optional:

```text
Compact
Custom
```

---

---

# 53. File Browser — correct expansion behavior

Default open:

```text
root visible
folders collapsed
```

Do not auto-expand the first level.

When an external action opens:

```text
src/foo/bar.ts
```

expand only:

```text
src/
src/foo/
```

to reveal that file.

Do not expand unrelated siblings.

Remember user expansion state per workspace/session where appropriate.

Search mode must not destroy expansion state.

Refresh must not explode the tree open.

---

---

# 54. File Browser right-click menu

Add icons and context-aware actions.

For folders, useful actions may include:

```text
Open / focus
Add folder to chat
Copy mention
Copy relative path
Reveal in Explorer/Finder
Expand
Collapse
Expand descendants / Expand all
Collapse descendants / Collapse all
Refresh
```

For files:

```text
Open
Open preview/editor
Add to chat
Copy mention
Copy relative path
Reveal in Explorer/Finder
Open diff if changed
```

Only show actions that are actually available.

Use icons consistently.

Keyboard accessible equivalents must exist for essential actions.

Do not create a giant context menu full of dead items.

---

---

# 55. Side-panel buttons

Audit unclear icon-only buttons.

Every important button needs:

```text
clear icon
tooltip
accessible name
hover/focus state
pressed/selected state when relevant
```

Use existing functional icon sets.

Use RUNE brand art only for RUNE identity.

---

---

# 56. Actions 2.0

The repo already has project scripts/actions foundations.

Do not rebuild from scratch.

Finish:

```text
auto-discovery from package.json/rune.json/workspaces
categories
icons
keybindings
run-on-worktree creation
process registry
live status
terminal/output
preview URL
agent-callable semantic action ID
approval policy
```

Example:

```text
Test
Build
Typecheck
Lint
Dev server
Storybook
Database
Custom
```

Agent should be able to call:

```text
run_action("test")
```

instead of rediscovering the shell command every time.

---

---

## Authoritative v4 — Environment Quick Panel

Add the compact topbar Environment popover as a RUNE-native **glance layer** above the full right-panel Environment cockpit.

Topbar:

```text
[Hand off] [+ Add action] [Environment] [Right panel]
```

Popover:

```text
Environment

Changes                    +77 −40
Local                           ›
main                            ›
Commit & push                   ›
Local Servers               0   ›

Usage                        71% ›   // only when trustworthy

Repository
bitreonx/Rune                   ↗

Editor
Editor view
Open in Explorer                ›
```

RUNE improvements:

- `Changes` is thread-scoped for an active chat; workspace scope is explicitly labeled when chosen.
- every row is real/clickable;
- row click opens/focuses the corresponding full right-panel surface;
- popover/panels share canonical state;
- hide irrelevant sections rather than filler;
- Usage only when trustworthy;
- Local Servers from Process/Action Registry;
- real icons for every action;
- restrained RUNE liquid glass;
- anchored open/close ~180–240ms, collision-aware;
- keyboard navigation, Escape, focus restoration;
- event-driven live updates;
- child threads use their own worktree/environment scope;
- attention dot only for meaningful `Needs attention`.
