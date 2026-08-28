---
task_id: T15
title: RUNE assets and canonical Provider Brand Registry
status: TODO
depends_on: [T00]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T15 — RUNE assets and canonical Provider Brand Registry

## Purpose

Make latest RUNE assets authoritative and every known harness/provider/service use the correct local icon consistently across the product.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master sections 48–50 and 266–269.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


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

# 266. Central Provider Brand Registry — one source of truth

Provider/harness identity is currently visually inconsistent.

Create/finish ONE canonical local brand registry.

Conceptually:

```ts
ProviderBrand {
  id
  displayName
  icon
  iconDark?
  iconLight?
  monochromeIcon?
  accent?
  accessibilityLabel
  source
}
```

It must cover every known RUNE harness/provider/service.

The same registry powers:

```text
provider settings
instance manager
composer harness picker
model picker
thread header
sidebar
handoff
Usage
Environment
Agents
Plan role bindings
Developer Trace
diagnostics
```

Do not independently branch:

```text
if antigravity ...
if claude ...
```

across ten components.

---

---

# 267. Antigravity must use the REAL dedicated Antigravity icon

The current generic/wrong icon is a product defect.

Source the canonical Antigravity mark from:

```text
official Antigravity/Google assets if available
or a legally reusable bundled integration asset
```

Synara's MIT implementation may be used as a reference, and directly adapted only with appropriate attribution/license handling.

Requirements:

```text
local asset/component
no network dependency for normal rendering
dark/light-safe
crisp at 12/14/16/20/24px
stable SVG IDs
accessible
no filter-ID collisions
```

Test screenshots/snapshots in:

```text
provider picker
settings
instance row
chat header
handoff
usage
Agent/Plan binding
```

A known provider must never fall back to a generic placeholder because one surface forgot the mapping.

---

---

# 268. RUNE Native must use the latest real RUNE mark

For the RUNE Native harness/provider identity, use the canonical latest RUNE product mark from the current:

```text
assets/svg/
```

asset pipeline.

Do not use:

```text
generic terminal glyph
old T3 icon
old Synara icon
random AI sparkle
missing placeholder
```

Use the RUNE mark consistently for RUNE-owned native execution identity.

Do not replace third-party provider icons with RUNE branding.

Correct distinction:

```text
Harness: RUNE Native
→ RUNE mark

Service: OpenRouter
→ OpenRouter icon

Model vendor, when shown separately
→ appropriate model/vendor icon
```

---

---

# 269. Brand registry regression tests

Verify every known provider/harness/service has a resolvable local brand.

At minimum:

```text
RUNE Native
Codex
Claude Code
Antigravity
Cursor
OpenRouter
OpenAI
Anthropic
Google/Gemini where represented
OpenCode
Kilo
Pi
Grok
Droid
custom gateway fallback
```

Test:

```text
dark
light
high DPI
small picker size
header size
no duplicate SVG filter IDs
no external network fetch required
```

---