---
task_id: T13
title: Provider management UX and settings cleanup
status: PARTIAL_WITH_EVIDENCE
depends_on: [T00, T01, T02, T03]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T13 — Provider management UX and settings cleanup

## Purpose

Make instance/provider settings impossible to misunderstand, keep connection ownership correct, expose exact remediation, and remove filler/dead settings.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master sections 29–32, 68, 172–180 and provider readiness gates.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


# 29. Custom Gateway — fix the architecture

Do not infer durable gateway mode solely from whether URL/key strings are currently non-empty.

Add/extend a canonical connection/service config with explicit fields conceptually like:

```ts
mode:
  | "native"
  | "openrouter"
  | "api-provider"
  | "custom"

protocol:
  | "openai-compatible"
  | "anthropic-compatible"
  | ...

baseUrl
credentialRef
customHeaders
customModels
catalogStrategy
```

Use the existing RUNE settings/contracts style.

Secrets must remain securely stored/redacted.

## UX

Click Custom Gateway:

```text
selection stays Custom Gateway immediately
form opens
user can enter URL
user can enter credential
user can choose protocol
user can test connection
user can discover/add models
user can save/cancel
```

Do not fall back to default while the form is incomplete.

Add migration from old env-var-inferred config.

Add tests reproducing the current empty-value fallback.

---

---

# 30. Provider chooser architecture

Audit the entire flow:

```text
provider/harness chooser
→ instances list
→ selected instance
→ service connection
→ model picker
```

Expected:

- clicking a harness/provider management arrow opens its instances/management surface;
- it should not force immediate Add Instance unless no alternative UX is possible;
- Add Instance is explicit;
- each instance owns its connection/service configuration;
- multiple accounts are supported;
- each model picker entry resolves the correct instance;
- subagents inherit or explicitly override provider/service rather than silently using defaults.

Never let UI selection and runtime routing disagree.

---

---

# 31. Antigravity — replace “Needs attention” with a guided state machine

The server already detects useful states.

Expose them directly.

Canonical states:

```text
Disabled
Checking
CLI not installed
CLI path invalid
Version probe failed
Version probe timed out
Sign-in required
Authenticated
Model discovery failed
Model discovery timed out
No usable models
Ready
```

For every non-ready state show:

```text
what is wrong
what RUNE checked
what the user should do
one primary recovery action
secondary details
Retry / Refresh
```

Examples:

```text
Antigravity needs sign-in
[Open terminal and run agy] [Retry]
```

```text
Antigravity CLI not found
Expected: agy
[Install guide] [Choose binary] [Retry]
```

Do not show only “Needs attention”.

Do not make users read provider documentation to infer the problem RUNE already knows.

---

---

# 32. Provider icons

Audit all provider cards/model menus/instance selectors.

Requirements:

- actual provider icon where available,
- reliable local/fallback icon,
- no missing/broken image placeholders,
- no RUNE logo pretending to be a provider,
- consistent sizing,
- accessible label,
- no icon network request required for core UI if avoidable.

---

---

# 68. Settings cleanup

Audit all settings added during RUNE development.

Classify:

```text
meaningful
advanced but useful
duplicate
debug-only
filler
dead
```

Keep the product curated.

Do not add a toggle for every environment subsection/activity row.

Advanced diagnostic controls belong in Diagnostics/Developer areas.

---

---

# 172. Instance Manager UX

The instance menu should feel like managing execution identities, not environment variables.

Example:

```text
Claude Code
────────────────────────────

Claude Personal                       Ready
Native Anthropic
Sonnet

Claude OpenRouter                     Ready
OpenRouter
ox-alpha

Claude Corporate                      Needs setup
Custom Gateway
No credential

+ New instance
```

Click instance:

```text
Overview
Connection
Models
Permissions
Advanced
Diagnostics
```

Do not immediately open Add Instance when the user clicks the provider arrow.

The provider arrow opens the existing-instances list first.

---

---

# 173. New Instance Wizard

Flow:

```text
1. Choose harness
2. Name instance
3. Choose connection
   Native / OpenRouter / Custom / other compatible service
4. Authenticate / select credential
5. Choose model profile
6. Validate runtime
7. Save
```

RUNE auto-fills:

```text
correct protocol
correct base URL
compatibility profile
recommended environment
```

for known connections.

Advanced users may inspect/override safe fields.

Do not ask normal users to manually type known OpenRouter Claude-Code compatibility variables.

---

---

# 174. Validate Instance — real runtime validation

Add a provider-specific validation operation.

It validates the SAME compiled runtime manifest used by real sessions.

Do not validate one code path and execute another.

Success:

```text
Ready · 428 ms

Harness       Claude Code
Service       OpenRouter
Auth          Valid
Gateway       Reachable
Model         Available
Capabilities  Tool use ✓
```

Conflict:

```text
Configuration conflict

ANTHROPIC_API_KEY is inherited from the native environment
and conflicts with this OpenRouter-managed instance.

[Fix automatically]
[View diagnostics]
```

Do not expose secret values.

A validation may use a tiny real provider request when that is the only honest proof, but disclose that it can consume provider quota.

Prefer metadata/probe APIs where available.

---

---

# 175. Runtime diagnostics — show why routing happened

Every external-harness session gets a safe Routing section in Developer Trace:

```text
Requested
Claude OpenRouter

Resolved
Harness: Claude Code
Instance: claude-openrouter-1
Service: OpenRouter
Model: stealth/ox-alpha

Runtime
Config isolation: yes
Compatibility profile: claude-openrouter@2026-08
Endpoint: https://openrouter.ai/api

Source
Thread pinned instance
```

If fallback would occur, prevent/surface it explicitly.

---

---

# 176. No silent Native fallback

Hard invariant:

If user selected:

```text
Claude OpenRouter
```

and that instance is invalid:

```text
FAIL / Needs setup
```

Do NOT use native Claude account.

Silent fallback can charge the wrong account, use the wrong model, break privacy expectations, and make debugging impossible.

Fallback is allowed only when the user selected an explicit Auto/fallback policy.

---

---

# 177. Multi-instance scale

Support many instances without a wall of cards.

Provide:

```text
search
group by harness
favorite/pin
recent
status filter
duplicate instance
export safe config without secrets
```

Allow:

```text
5 Codex accounts
3 Claude connections
2 OpenRouter profiles
corporate gateways
```

without naming collisions.

Use human display names plus stable IDs.

---

---

# 178. Planner / Agent role bindings use provider instances

Plan Mode directly consumes the instance system.

Example:

```text
Planner
GPT-5.6 Sol · High
Instance: OpenRouter Planning

Workers
GPT-5.6 Luna · High
Instance: OpenRouter Build

Reviewer
Codex
Instance: Codex Account 3
```

Plan RoleBinding points to `providerInstanceId` and optionally overrides model/effort.

Planner and executor do not need the same harness/service/account.

---

---

# 179. Provider/harness compatibility matrix

Maintain a capability matrix.

Example concepts:

```text
Claude Code
  Native Anthropic              supported
  OpenRouter Anthropic gateway  supported
  Custom Anthropic gateway      supported
  arbitrary OpenAI-compatible   not automatically compatible

Codex
  OpenAI native                 supported
  OpenRouter Responses          supported
  custom Responses-compatible   capability-dependent

RUNE Native
  OpenRouter                    supported
  OpenAI                        supported
  Anthropic                     supported
  custom compatible APIs        protocol-dependent
```

Do not let the UI offer a combination the adapter cannot actually compile.

If experimental, label it and show the exact limitation.

---

---

# 180. Provider-specific compatibility profiles

Do not scatter gateway setup variables through UI components.

Create adapter-owned versioned profiles:

```text
ClaudeNativeProfile
ClaudeOpenRouterProfile
ClaudeCustomAnthropicProfile

CodexNativeProfile
CodexOpenRouterProfile
```

Profile responsibilities:

```text
protocol
known endpoint
required env
env variables to scrub
model-slot mapping
capability flags
validation strategy
diagnostic labels
```

UI chooses profile/connection.

Adapter compiles runtime.

---

---

# 287. Provider-selection correctness gate

For every provider/harness shown in the composer:

```text
selected UI identity
=
pinned providerInstanceId
=
resolved runtime
=
icon/label shown
=
Turn Trace provider
```

No drift.

For example:

```text
Antigravity selected
→ Antigravity adapter/runtime
→ Antigravity icon
→ Antigravity models

RUNE Native + OpenRouter selected
→ Native loop
→ OpenRouter service
→ RUNE harness mark + OpenRouter service identity
```

If these disagree, the product is broken.

---

---

# 288. Never ship a provider as "available" when it is nonfunctional

Provider availability should be capability/readiness-driven.

States:

```text
Ready
Needs setup
Unavailable
Experimental
Broken / incompatible version
```

If an adapter cannot complete its minimum smoke:

```text
do not show Ready
```

If behind experimental support:

```text
label Experimental
```

with exact limits.

No false green states.

---
