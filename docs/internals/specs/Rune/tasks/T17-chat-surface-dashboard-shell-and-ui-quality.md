---
task_id: T17
title: Chat surface, dashboard shell, visual system, and anti-slop quality
status: PARTIAL_WITH_EVIDENCE
depends_on: [T00, T04, T09, T12]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T17 — Chat surface, dashboard shell, visual system, and anti-slop quality

## Purpose

Deliver an open-canvas professional IDE surface, premium composer/right rail, scalable shell, coherent task rail, accessibility, and restrained motion without card soup.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master UI quality/shell reconciliation sections 47–55 and 130A–130F.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


# 47. Design anti-slop must be a runtime quality system

For UI work, do not rely on:

```text
"make it beautiful"
"don't make AI slop"
```

Activate relevant design guidance and verify the output.

Detect/avoid:

```text
card-in-card soup
random gradients
meaningless glass
giant radii everywhere
too many pills
weak hierarchy
template dashboard composition
low information density
duplicated labels
unnecessary icon noise
inconsistent spacing
bad responsive collapse
```

Then perform:

```text
render/browser check
responsive check
keyboard/focus check
accessibility check
visual hierarchy review
repair
```

---

---

# 48. RUNE brand assets — make `assets/` authoritative

Audit all product-owned branding targets:

```text
desktop icon
Windows icon
web favicon
apple touch icon
PWA
marketing favicon/icon
splash/loading
titlebar/product logo
installer/package artwork where relevant
```

Derive them from the latest `assets/` kit.

Use the existing export script or improve it into the canonical pipeline.

Run:

```text
pnpm icons:export
pnpm icons:check
```

or current equivalents.

Do not manually maintain drifting duplicate icons.

---

---

# 49. Animated RUNE loader

Use:

```text
assets/svg/rune-animated-loader.svg
```

for appropriate **brand-level loading moments**:

```text
app startup
primary environment boot
major workspace restore
```

Do not use a giant RUNE animation for every tiny spinner/button.

Small local operations should keep lightweight spinners/progress affordances.

Respect reduced motion.

---

---

# 50. Remove stale product branding carefully

Search for:

```text
T3
Synara
upstream product logo
old RUNE mark variants
obsolete favicons
old desktop icons
```

Distinguish:

```text
product-owned branding
third-party attribution/provider branding
internal compatibility names
```

Remove/replace only product-owned stale visuals/strings that should be RUNE.

Do not break required upstream license/attribution or provider identity.

---

---

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

# 130A. Latest Chat Surface architecture is mandatory

Use `chat-surface(1).md` as the current visual direction with these authoritative clarifications:

```text
User message → restrained contained surface
Assistant message → open canvas, no assistant card soup
Agent Activity → inline semantic rail
Code changes → inline real diff receipts
Subagent → compact inline collaborator row → click opens live child chat in right panel
Composer → primary premium liquid-glass card
Goal → integrated at composer top
Queue → compact layered list inside composer
```

Reject paper-stack message metaphors, assistant cards, frozen inline child transcripts, crooked/rotated queue gimmicks, and duplicated goal banners.

---

---

# 130C. Settings / provider architecture reconciliation

Use `settings-polish(1).md` with hierarchy:

```text
Harness
→ Provider Instance
   → Service Connection
   → Account/Auth
   → Models
   → Advanced
```

Connection configuration belongs to the selected INSTANCE. Custom Gateway dispatch is explicit durable runtime configuration. UI selection and actual routing must agree.

---

---

# 130D. Skills architecture reconciliation

Use `skills-folder-redirector(1).md` with:

```text
Skill files → source of CONTENT truth
RUNE Skill Registry → source of DISCOVERY / ACTIVATION / RUNTIME truth
```

Define Discovery Adapter (`provider/filesystem → registry`) separately from Execution Bridge (`registry → provider runtime`). Do not silently rewrite original skills. Do not ship speculative provider config keys without verified upstream support.

---

---

# 130E. Usage architecture reconciliation

Use `usage-page(1).md`. Usage is a developer cost inspector, not a dashboard billboard.

Prefer total + provenance + provider/model/time breakdown + click-through to real work + live turn/subagent cost.

Reject decorative forecast/top-three/micro-sparkline filler and fake zero-cost coverage.

Provider coverage must be capability-driven: cost available / tokens available / session telemetry available / unavailable. Never claim telemetry exists without evidence.

---

---

# 130F. Dashboard reconciliation

Use `dashboard-shell(1).md` for performance/layout direction with two corrections:

1. Do not depend on removed historical `usageOverview` trend concepts. Current-turn shell cost can read runtime usage; historical cost belongs on `/usage`.
2. Do not depend on an assistant `MessageCard`; assistant chat is open-canvas.

The polished-shell beta flag is a rollout mechanism, not permanent dual-shell maintenance: opt-in dogfood → release candidate → stable default → temporary rollback window → remove legacy duplication after confidence.

---
