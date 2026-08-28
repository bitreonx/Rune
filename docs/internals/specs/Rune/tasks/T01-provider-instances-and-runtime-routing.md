---
task_id: T01
title: Provider instances, service connections, runtime manifests, and multi-account routing
status: TODO
depends_on: [T00]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T01 — Provider instances, service connections, runtime manifests, and multi-account routing

## Purpose

Make provider/harness instances real isolated execution identities so UI selection, credential source, model binding, and spawned runtime can never disagree.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master provider/settings sections plus the full instance-runtime redesign (29–30, 159–190, provider-selection gates).

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

# 159. PROVIDER INSTANCE SYSTEM — root-cause repair and redesign

This section is release-critical.

The current instance/provider behavior is proven confusing and broken for at least the Claude Code → OpenRouter path.

Observed behavior:

```text
With project/user Claude config manually pointing Claude Code to OpenRouter
→ Claude Code through RUNE works.

Remove that manual .claude settings configuration.

Create a RUNE Claude instance.
Select OpenRouter in RUNE.
Add OpenRouter credential.
Use that Claude instance.
→ runtime does not correctly use OpenRouter / behaves Native / fails.
```

Do not patch this by telling the user to recreate `.claude/settings.local.json`.

RUNE must own the instance runtime configuration.

---

---

# 160. Concrete code-level root-cause hypotheses to prove

Current repository review already identifies one direct defect:

```text
UniversalServiceSettings
→ writes service/env configuration

BUT

ClaudeAdapter runtime dispatch
→ reads separate `claudeService`
```

Therefore UI state and runtime routing can disagree.

The reviewed settings code explicitly identifies that Custom/OpenRouter values can be stored while runtime remains Native because the dispatch flag is incoherent.

Treat this as a known high-confidence bug and reproduce it with a failing test.

Investigate additional causes before declaring the whole issue fixed.

---

---

# 161. Current OpenRouter/Claude Code compatibility profile is richer than base URL + token

Current OpenRouter guidance for Claude Code shows gateway use may require more than:

```text
ANTHROPIC_BASE_URL
ANTHROPIC_AUTH_TOKEN
```

A robust OpenRouter Claude Code profile currently includes concepts such as:

```text
ANTHROPIC_BASE_URL=https://openrouter.ai/api
ANTHROPIC_AUTH_TOKEN=<credential>
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=<credential>

CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK=1
CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1

gateway/model slot mappings
tool-search/system-prompt compatibility settings where model capability supports them
```

Do NOT blindly hardcode every environment variable forever.

Create a versioned provider/harness compatibility profile owned by the Claude adapter.

The profile is capability-aware and updateable.

Important endpoint distinction:

```text
OpenRouter OpenAI-compatible API
https://openrouter.ai/api/v1

OpenRouter Anthropic-compatible Claude Code gateway
https://openrouter.ai/api
```

The instance UI should not force users to know this distinction.

The adapter compiles the correct endpoint based on protocol/harness.

---

---

# 162. Why manual `.claude/settings.local.json` likely worked

Treat this as a hypothesis to verify through reproduction.

The manual file may have supplied some combination of:

```text
gateway base URL
authentication token
cleared conflicting Anthropic API key
model aliases
gateway discovery flag
tool-search/system-prompt compatibility flags
```

while the RUNE-created instance currently supplies only part of that runtime environment or fails to select the OpenRouter dispatch mode at all.

Therefore the process can fall back to native Claude account/config or start with an invalid/incomplete gateway runtime.

Reproduce with a spawn-manifest diff:

```text
WORKING manual configuration
vs
BROKEN RUNE instance configuration
```

Redact secrets.

Compare every:

```text
environment variable name/config source
config root
CLI argument
model
cwd
home/config path
service mode
credential source
```

This diff should reveal the exact missing/overridden inputs.

---

---

# 163. External harness instance isolation

A RUNE instance must be a real isolated execution identity.

Do not define "instance" as merely:

```text
display name + selected service
```

Canonical hierarchy:

```text
Harness Definition
        ↓
Provider Instance
        ├─ Runtime home/config
        ├─ Service Connection
        ├─ Credential reference
        ├─ Model role profile
        ├─ Capability overrides
        └─ Environment policy
```

Example:

```text
Claude Code

├─ Claude Personal
│  Native Anthropic login
│  Sonnet
│
├─ Claude OpenRouter
│  OpenRouter connection
│  ox-alpha
│
└─ Claude Corporate
   Custom Anthropic-compatible gateway
   company credential
```

These instances must not overwrite each other.

---

---

# 164. Native means native — managed means managed

## Native harness account

```text
Claude Code
Service: Native
```

RUNE intentionally allows the harness to use the user's existing native auth/config.

Do not inject gateway credentials.

## RUNE-managed connection

```text
Claude Code
Service: OpenRouter
```

RUNE compiles the complete OpenRouter-compatible runtime environment for this specific instance.

Do not accidentally inherit conflicting native endpoint/auth variables.

## Custom Gateway

RUNE compiles the selected protocol/profile.

Never infer mode only from whether URL/key happens to be non-empty.

---

---

# 165. ProviderInstance model — one source of truth

Conceptually:

```ts
interface ProviderInstance {
  id: ProviderInstanceId;
  name: string;

  harnessKind: HarnessKind;
  connectionId: ServiceConnectionId | null;

  authMode: "native" | "rune-managed";
  runtimeHomePolicy: "native" | "isolated";

  modelProfileId: ModelProfileId | null;
  environmentOverrides: SafeEnvironmentOverride[];

  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Do not encode dispatch truth in one UI field plus unrelated env vars plus hidden adapter defaults.

---

---

# 166. ServiceConnection is reusable, but binding belongs to the instance

Conceptually:

```ts
interface ServiceConnection {
  id: ServiceConnectionId;
  name: string;

  kind:
    | "anthropic"
    | "openrouter"
    | "openai"
    | "custom";

  protocol:
    | "anthropic-compatible"
    | "openai-responses"
    | "openai-chat"
    | "provider-native";

  baseUrl?: string;
  credentialRef?: SecretRef;
  headers?: SafeHeaderTemplate[];
  modelCatalogPolicy?: ModelCatalogPolicy;
  compatibilityProfileId?: string;
}
```

A connection may be reusable across multiple instances.

But each instance explicitly binds to one.

Changing one instance must not silently reroute all instances unless they intentionally share the edited connection.

---

---

# 167. Model Role Profile

External harnesses often have internal model roles/aliases.

Do not force all of them to the same expensive model.

Conceptually:

```ts
interface ModelRoleProfile {
  main?: ModelBinding;
  fast?: ModelBinding;
  small?: ModelBinding;
  subagent?: ModelBinding;
  reviewer?: ModelBinding;
}
```

For Claude Code through OpenRouter, compile appropriate main/fast/family slots according to selected user policy and actual model capability.

If a non-Claude OpenRouter model cannot faithfully support a Claude-specific capability such as tool search, disable/adapt that capability rather than sending incompatible settings.

Record these decisions in Developer Trace.

---

---

# 168. Compiled Instance Runtime Manifest

Before spawning any external harness session, compile an immutable runtime manifest.

Conceptually:

```ts
interface InstanceRuntimeManifest {
  instanceId: ProviderInstanceId;
  harnessKind: HarnessKind;

  binaryPath: string;
  cwd: string;
  configHome: string | null;

  serviceConnectionId: ServiceConnectionId | null;
  protocol: string;

  modelBindings: Record<string, string>;

  environmentKeys: string[];
  environmentHash: string;

  credentialSource: "native" | "secret-ref";
  compatibilityProfileVersion: string;

  generatedAt: string;
}
```

The actual secret-bearing environment remains private.

Every session stores the manifest fingerprint.

Developer Trace can safely show:

```text
Instance       Claude OpenRouter
Harness        Claude Code
Service        OpenRouter
Protocol       Anthropic-compatible
Endpoint       https://openrouter.ai/api
Credential     rune-secret:openrouter-main
Model          stealth/ox-alpha
Config home    isolated
Profile        claude-openrouter@2026-08
```

without revealing the key.

This makes "why did it use Native?" immediately diagnosable.

---

---

# 169. Isolated config home per managed instance

For RUNE-managed external harness instances, avoid accidental global config bleed.

Where upstream supports it:

```text
instance
→ RUNE-managed isolated config/home
→ explicit safe projection of required user settings
→ explicit project cwd
```

For Claude Code, inspect current `CLAUDE_CONFIG_DIR` / `ClaudeHome` behavior and build on the existing home/config infrastructure rather than creating another ad-hoc home system.

Do not mutate the user's real `~/.claude` to switch instances.

Native-mode instance may intentionally use the user's normal native config.

Managed OpenRouter/custom instances should be isolated enough that:

```text
global native credentials
global base URL
old project settings
another RUNE instance
```

cannot silently override their routing.

Document any upstream config that cannot be isolated.

---

---

# 170. Environment precedence contract

Define and test exact precedence.

Recommended conceptual precedence for a RUNE-managed instance:

```text
1. mandatory RUNE instance compatibility env
2. instance explicit overrides
3. service connection compiled env
4. safe project environment
5. safe process environment
```

Conflicting sensitive routing variables from lower layers must be scrubbed when the managed instance owns them.

Examples:

```text
ANTHROPIC_BASE_URL
ANTHROPIC_AUTH_TOKEN
ANTHROPIC_API_KEY
OPENROUTER_API_KEY
model alias variables
```

Do not let an inherited global variable silently win.

For Native mode, preserve native harness behavior.

---

---

# 171. Session pinning

When a thread/session is created, resolve and pin:

```text
providerInstanceId
serviceConnectionId
model profile/version
runtime manifest fingerprint
```

Changing the default instance later must NOT silently change an existing thread.

User may explicitly:

```text
Switch instance
Hand off
Fork with another instance
```

Subagents inherit the parent instance by default unless the plan/task/agent profile overrides it.

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

# 181. Migration from existing instances

Inventory current:

```text
claudeService
environment variables
custom base URL
API-provider credentials
providerInstanceId
model selection
```

Migrate deterministically into:

```text
ProviderInstance
ServiceConnection
ModelRoleProfile
```

If ambiguous, mark `Needs review`.

Do not guess a credential source.

Preserve native instances.

---

---

# 182. Regression for the user's exact Claude/OpenRouter failure

Add a permanent regression fixture.

### Phase A — control

Project/user `.claude/settings.local.json` supplies OpenRouter-compatible environment.

Claude Code request succeeds.

Capture redacted spawn manifest.

### Phase B — remove manual file

Remove/ignore that project-local routing config.

Create RUNE instance:

```text
Harness: Claude Code
Connection: OpenRouter
Credential: fixture
Model: fixture model
```

Before fix, reproduce failure/native misrouting.

### Phase C — after fix

Same RUNE instance:

```text
compiled manifest uses OpenRouter profile
conflicting native routing env scrubbed
correct endpoint used
correct model mapping used
request reaches OpenRouter fixture
```

No project `.claude/settings.local.json` required.

---

---

# 183. Spawn-manifest differential test

Compare:

```text
working manual config
vs
RUNE compiled config
```

Post-fix RUNE manifest must contain required semantic properties.

Never assert raw secrets.

Assert:

```text
service mode
protocol
endpoint
credential source
required env key names present
conflicting env keys scrubbed
model role mapping
config-home policy
```

---

---

# 184. Instance isolation tests

At minimum:

```text
1. Claude Native and Claude OpenRouter coexist.
2. starting Native does not change OpenRouter config.
3. starting OpenRouter does not modify ~/.claude.
4. OpenRouter does not inherit conflicting Anthropic API key.
5. two OpenRouter instances can use different credentials.
6. two instances can use different model profiles.
7. switching default does not mutate existing thread.
8. new thread uses selected instance.
9. subagent inherits parent instance by default.
10. Plan task can override to another instance.
11. failed managed instance never silently falls back Native.
12. restart preserves all bindings.
13. secret values never appear in logs/trace.
14. validation and real spawn use same manifest compiler.
15. deleting one instance does not delete a shared connection still referenced elsewhere.
```

---

---

# 185. Claude/OpenRouter compatibility tests

Use current adapter behavior and a fixture/mock gateway where real credentials are unavailable.

Verify:

```text
correct Anthropic-compatible OpenRouter endpoint
auth token reaches child process
native Anthropic key is scrubbed for managed gateway mode
gateway model discovery flag where current Claude version requires/supports it
main model mapping
fast/small model role mapping
tool-search compatibility based on selected model capability
CLI arguments correct
working cwd correct
isolated/native config-home policy correct
```

Test current Claude Code version compatibility rather than assuming one static profile forever.

---

---

# 186. RUNE Native vs external harness choice

For a raw OpenRouter model, preferred:

```text
RUNE Native
→ OpenRouter
```

because RUNE controls tools, request count, context, subagents, and verification.

For a user who explicitly wants Claude Code behavior:

```text
Claude Code instance
→ OpenRouter compatibility profile
→ OpenRouter
```

Both must work.

Do not force raw API use through Claude Code.

Do not remove external-harness compatibility.

---

---

# 187. Instance management completion gate

Do not mark provider-instance work complete until:

```text
✓ UI selection equals runtime routing.
✓ manual .claude OpenRouter config is no longer required.
✓ reported Claude/OpenRouter failure is reproduced then fixed.
✓ OpenRouter connection uses current Claude-Code compatibility profile.
✓ managed instance routing cannot be overridden by unrelated native env.
✓ Native instance still uses native Claude auth correctly.
✓ multiple Claude instances work simultaneously.
✓ many accounts have stable independent IDs.
✓ threads are pinned to instances.
✓ subagents inherit/override correctly.
✓ Plan Mode role bindings can target any instance.
✓ no silent Native fallback.
✓ safe runtime manifest visible in Developer Trace.
✓ secrets are redacted.
✓ migration preserves existing users.
✓ focused tests pass.
✓ packaged desktop path uses same behavior.
```

---

---

# 188. Updated implementation ordering

Provider instance correctness is foundational for multi-model Plan Mode.

Use:

```text
0  startup health + baseline
1  requirement ledger
2  provider-instance runtime compiler
3  Claude/OpenRouter exact regression + fix
4  service connections + instance manager UX
5  native harness/provider correctness
6  queue / steer / pause / resume / stop
7  child-thread agent system
8  native asker / Grill
9  PlanSession + RoleBinding + Spec
10 PlanGraph + critic + plan editor
11 deterministic orchestrator
12 plan tasks → child workers
13 review / verification
14 semantic activity + diff receipts
15 Environment/right panels/files/actions
16 skills registry/pipelines
17 usage/trace
18 full UX/accessibility/performance
19 packaged release verification
```

Do not build sophisticated multi-provider planning on top of broken instance routing.

---

---

# 189. Required implementation artifacts

Create:

```text
docs/rune/PLAN-MODE-ARCHITECTURE.md
docs/rune/PROVIDER-INSTANCE-RUNTIME-ARCHITECTURE.md
docs/rune/CLAUDE-OPENROUTER-REGRESSION.md
```

The regression report contains:

```text
observed old behavior
reproduction
redacted manifest diff
root cause(s)
fix
tests
real/fixture verification
```

Do not include secrets.

---

---

# 190. Current external reference notes for implementer

Re-check these at implementation time because gateway/harness behavior changes.

Current OpenRouter material used when writing this requirement:

```text
Ori Harness announcement (2026-08-04)
https://openrouter.ai/blog/announcements/ori-harness/

Using OpenRouter with coding agents (2026-06-16)
https://openrouter.ai/blog/tutorials/any-coding-agent/
```

The important lesson is NOT "copy Ori".

The lesson is:

> external harness gateway compatibility is a versioned adapter concern, not a handful of fields the user must guess.

RUNE should compile and validate the right configuration for the selected harness/service/model.


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