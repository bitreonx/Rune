# Settings & Provider Instance Management — Grill Direction

> Spec status: **draft, awaiting maintainer review**. Rewritten from a code review of `apps/web/src/components/settings/ProviderInstanceCard.tsx`, `ProviderInstanceEditPage.tsx`, `UniversalServiceSettings.tsx`, `ProviderSetupNotice.tsx`, `UniversalServiceSettings.test.ts`, `ClaudeServiceSettings.tsx`, `ProviderAccentColorPicker.tsx`, `ProviderEnvironmentSection.tsx`, `ProviderModelsSection.tsx`, `ProviderSettingsForm.tsx`, `SettingsPanels.logic.ts`, `settingsLayout.tsx`, `SettingsBreadcrumb.tsx`, `RedactedSensitiveText.tsx`, `HarnessesSection.tsx`, `ModelServicesSection.tsx`, `ProviderSettingsPanel.tsx`, `AddProviderInstanceDialog.tsx`, `AddProviderInstanceWizardSteps.tsx`, `AddProviderInstanceDialog.logic.ts`, `ClaudeSubscriptionCard.tsx`, `providerDriverMeta.ts`, `providerStatus.ts`, `apps/web/src/routes/settings.tsx`, `settings.providers.tsx`, `settings.providers.$instanceId.tsx`, and `apps/server/src/provider/Layers/ClaudeAdapter.ts`.

## 1. Principles

Settings should mirror how the system actually composes. The runtime graph is `harness → instance → service → model`. The UI should not invent a different graph.

- **Hierarchy first.** The left-rail nav is `Harnesses / Instances / Model Services` in that order, mirroring the runtime graph `harness → instance → service → model`. The per-instance editor itself nests `Connection / Account-Auth / Models / Advanced` under the active instance, so a user with multiple Claude/Codex accounts sees the dispatch picker once per instance — it is **not** a separate top-level section. Each section answers exactly one question; the user never has to guess which page holds a given knob.
- **One status badge, not a status bar.** A single dot + label is enough. Multi-segment decorations ("Installed / Authed / Up-to-date / Model available") read as a progress bar and lie about state.
- **Decorative counters are out.** No "Currently powering", no "Used N× today", no health-check countdown. These are the dashboard's job; settings is for configuration.
- **The UI selection is the runtime routing.** Selecting "OpenRouter" in the Service Connection panel must actually dispatch through OpenRouter. Today it only updates env vars; the adapter's `claudeService` flag is the actual switch and is not wired to the env-var editor.
- **`ProviderSetupNotice` is per-harness, not per-driver.** A notice that fires only for Antigravity (`ProviderSetupNotice.tsx:12`) is a bug.
- **No continuous animations.** Per AGENTS.md, the `bounce` on the update-available arrow at `ProviderInstanceCard.tsx:461` is a regression.
- **One design language.** The `bg-emerald-500/10 text-emerald-600` pill at `UniversalServiceSettings.tsx:185-190` is a hand-rolled exception; replace with the design-system token (`bg-success/10 text-success`).

## 2. Hierarchy-first navigation

The settings page is a single left-rail with **two tracks**: a top-level nav that mirrors the runtime graph, and a per-instance editor that nests the dispatch picker. Reject any layout that puts a global "Service Connection" section in the top-level nav — the dispatch is per-instance.

### 2.1 Top-level nav

Three top-level entries, in this order. Anything that lives on a per-instance basis goes under **Instances**, not at the top level.

```
Harnesses      — runtime binaries (Codex, Claude Code, Cursor, Grok, OpenCode, Antigravity)
Instances      — one card per providerInstanceId
Model Services — shared per-driver service definitions (e.g. one OpenRouter account shared across instances)
```

Reject any layout that mixes these on one page or puts the harness view below the instance view.

### 2.2 Harnesses — "What can RUNE talk to"

One card per supported harness: Codex, Claude Code, Cursor, Grok, OpenCode, Antigravity. Each card shows: binary path, version, install command, sign-in command. This is the **catalog view**, not the configured-instances view.

- A harness may have zero configured instances and still appear here; that's the empty state.
- Status comes from the harness probe (`ProviderDriverMeta.ts:76-81` for Antigravity; the rest of the catalog maps to `ProviderDriverMeta` entries the same way).
- The hand-coded five status badges at `HarnessesSection.tsx:121-181` collapse to one badge component driven by `PROVIDER_STATUS_STYLES`.

### 2.3 Instances — "Specific installs you have configured"

One card per `providerInstanceId`. Each shows: instance display name, harness it belongs to, selected model, and the per-instance `checkedAt`. The panel-level `lastCheckedAt` reduce at `ProviderSettingsPanel.tsx:431-438` is removed — it averages across drivers and is misleading on a per-instance edit page.

#### 2.3.1 Per-instance editor — nested sections

When the user opens an instance (e.g. `Claude Code · Instance 2`), the editor nests the dispatch picker under the active instance. The four nested sections are, in order:

```
Instance 2 (Claude Code)
├─ Connection     — Anthropic / OpenRouter / Custom Gateway (the dispatch picker)
├─ Account/Auth   — sign-in state, API key, OAuth
├─ Models         — per-instance model preferences
└─ Advanced       — env vars, accent colour, instance toggle
```

The same `UniversalServiceSettings` component is used inline on the card (`ProviderInstanceCard.tsx:599-605`) and on the dedicated page (`ProviderInstanceEditPage.tsx:567-578`); collapse `ClaudeServiceSettings.tsx:212-240` into it. The `ProviderSetupNotice` mounts from the page header at `ProviderInstanceEditPage.tsx:435` and the family-slot chooser at `ProviderInstanceEditPage.tsx:435-475` (instance header / family slot chooser / connection slot) is the top of the nested editor.

The mode is "Native" / "OpenRouter" / "Custom Gateway" but it is **one picker**, not three sibling cards, and the choice is **per-instance**: instance 2 can route through OpenRouter while instance 3 routes through the user's native Anthropic account. Selecting "OpenRouter" or "Custom" must produce a routing decision, not just an env-var write. See §3.

### 2.4 Model Services — "Shared per-driver service definitions"

Lives at the top level, not inside the per-instance editor. One section per shared service (a single OpenRouter account, a single custom-gateway URL shared across multiple instances). One section per harness family. The list uses `ProviderModelsSection.tsx:128-191`; the `max-h-40` fixed-height list at line 236 is a problem in its own right but is not addressed here.

## 3. Custom Gateway — fix at the data-model level

The Custom Gateway is currently a `DraftInput` that writes `ANTHROPIC_BASE_URL` + key. The form is fine. The data model is wrong, and the wiring is broken. The dispatch lives in the **per-instance connection editor** (§2.3.1) — the `claudeService` flag is per-instance, not global — and the runtime assertion fires from that per-instance editor, not from a top-level "Service Connection" section.

### 3.1 What the prior spec missed

The "base URL" + "key" pair is not a single `ProviderInstanceEnvironmentVariable`; it is two. Both are stored, but the routing decision ("does this instance route through Custom?") reads a separate `claudeService` flag from `ClaudeServiceSettings.tsx:31-55`, not from the env vars. The flag is per-instance: instance 2 can have `claudeService === "custom"` while instance 3 has `claudeService === "anthropic"`. A user can fill in a `baseUrl` without `claudeService === "custom"`, and the runtime ignores the URL silently. There is no signal that the field is inert.

### 3.2 The fix

1. Collapse `ClaudeServiceSettings` into `UniversalServiceSettings` (the inline + page variants are the same component, both mounted per-instance at `ProviderInstanceCard.tsx:599-605` and `ProviderInstanceEditPage.tsx:567-578`). One source of truth, one set of validations.
2. Make the `mode` ("anthropic" | "openrouter" | "custom") the **single per-instance dispatch flag** the adapter reads. The env-var proxy stays — the CLI reads env — but `claudeService` is the switch, not the env vars.
3. In `apps/server/src/provider/Layers/ClaudeAdapter.ts`: when `claudeService === "openrouter"`, write `ANTHROPIC_BASE_URL=https://openrouter.ai/api` + `ANTHROPIC_AUTH_TOKEN`. When `claudeService === "custom"`, write the user-provided base URL + key. When `claudeService === "anthropic"` (or unset), write nothing — let the CLI use the user's existing Claude account.
4. Add a runtime assertion in the per-instance Connection section of the editor: if `mode === "custom"` and `ANTHROPIC_BASE_URL` is empty, surface a blocking error inline in that section ("Custom mode selected but no base URL configured"). Same shape for `mode === "openrouter"` with no key. Today the user gets no signal that the runtime is ignoring the field.

### 3.3 Verification

- Selecting "OpenRouter" in instance 2's Connection section must route a real chat through OpenRouter end-to-end, while instance 3's "Native" continues to use Anthropic directly.
- Selecting "Custom Gateway" with a base URL + key on instance 2 must route through the user's gateway.
- "Native" must NOT write any env var and must use the Claude account the user already signed into.

This is the MVS (minimum viable spec) for the Custom Gateway work. Schema is unchanged — `claudeService` is already a runtime field; the bug is in the dispatch, not the type.

## 4. Antigravity — the real states, not the imagined ones

The prior spec invented `uninstalled / installed-not-signed-in / signed-in-warning / ready / updating / error / pending`. The adapter (`apps/server/src/provider/Layers/AntigravityAdapter.ts`) only emits a subset. Replace the imagined taxonomy with the actual emitted states.

### 4.1 What the adapter actually surfaces

- `session.state.changed` with `state: "starting" | "ready" | "error"` (`AntigravityAdapter.ts:236-244, 266, 349-355, 399-409, 665-668`).
- `runtime.warning` at `AntigravityAdapter.ts:669-678` saying "Antigravity headless mode does not expose RUNE's approval control channel…".
- `session.exited` with `exitKind: "graceful" | "error"`.

There is no `installed` / `unauthenticated` / `signed-in-warning` event in the adapter. Those came from the prior spec's imagination.

### 4.2 The new states

- `not-installed` — `agy` not on PATH, no `installCommand` shown. This is the only catalog state.
- `unauthenticated` — CLI exists, no auth token.
- `ready` — `session.state.changed { state: "ready" }`.
- `error` — `session.state.changed { state: "error" }` or `session.exited { exitKind: "error" }`.
- `headless-restricted` — adapter emitted the `runtime.warning`. **This is a real state the prior spec missed.**
- `pending` — pre-probe. Static grey dot, no label.

### 4.3 What goes away from `PROVIDER_STATUS_STYLES` (`providerStatus.ts:8-21`)

- `disabled` (amber) — misused; there is no "disabled" state, there is "instance toggle off" which is a different concept (a per-instance enabled flag, not a status).
- `warning` (warning) — misused; collapses `signed-in-warning` and `runtime.warning` into the same colour, which is the bug the prior spec created.

### 4.4 What gets added

- `pending` — grey, no label, used pre-probe. Today pre-probe maps to `warning` (`ProviderInstanceCard.tsx:220-221`) and reads identically to a real warning.
- `headless-restricted` — info tone, used when the runtime.warning is set.

## 5. Status taxonomy, one place

Centralize in `apps/web/src/components/settings/providerStatus.ts`. The full key set:

```
not-installed       (red)        "Not installed"
unauthenticated     (amber)      "Sign in to enable"
ready               (success)    "Ready"
error               (destructive) "Error"
headless-restricted (info)       "Headless mode"
pending             (grey)       (no label, static dot)
```

The 5 hand-coded badge strings at `HarnessesSection.tsx:121-181` are replaced by one `<StatusBadge statusKey={…} />` component that reads from this map.

## 6. Rejected decorations

Out, by maintainer direction. Each is named here so we don't re-add it.

- **4-segment status bar** (`Installed / Authed / Up-to-date / Model available`). Reads as a progress bar; lies about state.
- **"Currently powering" line** on the card. Decoration; belongs in chat.
- **"Used N× today" strip**. Requires a new event, a daily rollup, and a `lastUsedAt` field for a number that does not help the user configure anything.
- **Health check interval slider + countdown** (`ProviderSettingsPanel.tsx:709-773`). The interval is fine; the countdown ticks every second and the slider is decoration around a `NumberField` that already works.
- **Continuous `bounce` animation** on the update-available arrow (`ProviderInstanceCard.tsx:461`).
- **"remove light mode"** — the prior spec had a light-mode-cleanup section that is not in the requested direction. Out.

## 7. Accessibility checklist (preserved + tightened)

- `role="radio"`, `aria-checked`, arrow-key nav on the three cards in `UniversalServiceSettings.tsx:140-222`.
- Replace `bg-emerald-500/10 text-emerald-600` (lines 185-190) with `bg-success/10 text-success`.
- `aria-live="polite"` on the auth row (`ProviderInstanceCard.tsx:404-420`).
- Status dot fallback gets `aria-label={summary.headline}`.
- Add-provider wizard "Coming Soon" cards: `aria-disabled="true"`, `tabindex={-1}` (`AddProviderInstanceDialog.tsx:334-357`).
- Delete confirm: replace the 2-click arm flow at `ProviderInstanceEditPage.tsx:332-343` with the existing `Dialog` confirm pattern (used at `ProviderSettingsPanel.tsx:777`). Add a 2-second auto-disarm on `setDeleteArmed(true)` and clear on `Escape`.
- `ProviderInstanceCard.tsx:573-587` `DraftInput` for display name: keep, but verify focus ring and `aria-describedby` linking.
- `ProviderInstanceEditPage.tsx:462-527` family-slot chooser already uses `aria-current`; leave it.

## 8. Files in scope

Web: `apps/web/src/components/settings/ProviderInstanceCard.tsx`, `ProviderInstanceEditPage.tsx` (including `:435-475` — the instance header / family-slot chooser / connection slot that becomes the top of the nested per-instance editor), `UniversalServiceSettings.tsx` (`:140-222` — the three radio cards `Native Account` / `OpenRouter` / `Custom Gateway`), `ProviderSetupNotice.tsx`, `UniversalServiceSettings.test.ts`, `ClaudeServiceSettings.tsx`, `ProviderAccentColorPicker.tsx`, `ProviderEnvironmentSection.tsx`, `ProviderModelsSection.tsx`, `ProviderSettingsForm.tsx`, `SettingsPanels.logic.ts`, `settingsLayout.tsx`, `SettingsBreadcrumb.tsx`, `RedactedSensitiveText.tsx`, `HarnessesSection.tsx`, `ModelServicesSection.tsx`, `ProviderSettingsPanel.tsx`, `AddProviderInstanceDialog.tsx`, `AddProviderInstanceWizardSteps.tsx`, `AddProviderInstanceDialog.logic.ts`, `ClaudeSubscriptionCard.tsx`, `providerDriverMeta.ts`, `providerStatus.ts`.

Routes: `apps/web/src/routes/settings.tsx`, `settings.providers.tsx`, `settings.providers.$instanceId.tsx` (the per-instance editor route — the `ProviderSetupNotice` mounts at `:435` here, the `UniversalServiceSettings` at `:567-578`; the inline card variant mounts at `ProviderInstanceCard.tsx:599-605`).

Contracts: `packages/contracts/src/server.ts:89-98` (`ServerProviderSkill`) and `:162-198` (`ServerProvider`) — **no schema change required for the MVS**. `claudeService` is already a runtime field. The dispatch is the bug.

Server: `apps/server/src/provider/Layers/ClaudeAdapter.ts`. The mode-aware dispatch lives here. Nothing else in `apps/server` is in scope for this spec.

## 9. PR breakdown

| # | Title | What ships |
|---|---|---|
| 1 | `chore(settings): delete dead code + lock down animations` | Delete the unused `ProviderInstanceCard` import (`ProviderSettingsPanel.tsx:89`); the `SparklesIcon` import (`UniversalServiceSettings.tsx:9`); the `OPENROUTER_LOGO_URL` constant (line 14); the `onOpenAddApiProvider` prop (lines 56-62) — wire it or delete it, do not leave a zombie. Drop the `bounce` animation at `ProviderInstanceCard.tsx:461`. |
| 2 | `feat(settings): add `pending` + `headless-restricted` to PROVIDER_STATUS_STYLES; rewrite HarnessesSection` | Drop `disabled` and `warning` from `providerStatus.ts:8-21`. Add `pending` and `headless-restricted`. Replace the 5 hand-coded badges at `HarnessesSection.tsx:121-181` with one badge component. |
| 3 | `feat(settings): ProviderSetupNotice becomes 3-variant welcome/attention/error + per-harness mount` | Drop the antigravity gate at `ProviderSetupNotice.tsx:12`. Add the 3-variant shape (`welcome / attention / error`). Mount it from the harness card, not the instance card. |
| 4 | `feat(settings): collapse ClaudeServiceSettings into UniversalServiceSettings + RadioGroup + arrow-key nav` | Single component for inline + page variants. Replace the hardcoded `emerald-*` (lines 185-190) with `bg-success/10 text-success`. |
| 5 | `feat(settings): Custom Gateway data-model fix — assert mode + base URL are consistent at runtime` | `ClaudeAdapter` reads `claudeService` directly; the UI surfaces a blocking error when the env vars are missing. |
| 6 | `feat(settings): per-instance lastCheckedAt; drop panel-level reduce` | The misleading `lastCheckedAt` reduce at `ProviderSettingsPanel.tsx:431-438` is gone. Each card shows its own `checkedAt`. |
| 7a | `feat(settings): refactor left-rail nav to Harnesses / Instances / Model Services` | Touches the route file (`apps/web/src/routes/settings.tsx`) and the nav components (`settingsLayout.tsx`, `HarnessesSection.tsx`, `ModelServicesSection.tsx`). Top-level nav becomes three entries (Harnesses / Instances / Model Services) in that order. No content change — the Service Connection picker is no longer at the top level but the per-instance editor is unchanged in this PR. |
| 7b | `feat(settings): nest Connection / Account-Auth / Models / Advanced under the per-instance editor` | Touches `ProviderInstanceEditPage.tsx` (header + family-slot chooser + Connection section at `:435-475`) and `ProviderInstanceCard.tsx` (inline card's sections match the page's sections). The inline card's sections must match the page's sections so a user with 5 Claude Code instances sees the same four nested sections in both places. |
| 8 | `a11y(settings): keyboard nav, focus rings, aria-live` | The full checklist. |
| 9 | `chore(settings): delete confirm via Dialog` | Replace the 2-click arm at `ProviderInstanceEditPage.tsx:332-343` with the existing Dialog confirm pattern. |

## 10. Severity-1 findings

1. **Settings nav implies "Service Connection" is global, but the dispatch is per-instance.** The current flat nav puts a top-level "Service Connection" section, but `claudeService` is a per-instance flag and the runtime assertion in §3 fires from the per-instance editor, not from a global section. Refactor the nav to nest Connection under Instances (Harnesses / Instances / Model Services at the top; `Connection / Account-Auth / Models / Advanced` nested per-instance). PR 7a + 7b.
2. **Dead `ProviderInstanceCard` import** at `ProviderSettingsPanel.tsx:89`. PR 1.
3. **Continuous `bounce` animation** on the update-available arrow at `ProviderInstanceCard.tsx:461`. PR 1.
4. **Three radio cards with no `role="radio"`, no `aria-checked`, no keyboard focus state** (`UniversalServiceSettings.tsx:140-222`). PR 4 + PR 8.
5. **`onOpenAddApiProvider` prop is declared and never wired** (`UniversalServiceSettings.tsx:56-62`). PR 1 (delete or wire).
6. **`SparklesIcon` import is unused** (`UniversalServiceSettings.tsx:9`). PR 1.
7. **`OPENROUTER_LOGO_URL` constant is unused** (`UniversalServiceSettings.tsx:14`). PR 1.
8. **`ProviderSetupNotice` is hard-gated to one driver** (`ProviderSetupNotice.tsx:12`). PR 3.
9. **`ProviderSetupNotice` mounts for every driver regardless of configuration** (`ProviderInstanceCard.tsx:543`, `ProviderInstanceEditPage.tsx:435`). PR 3 (move to harness).
10. **`PROVIDER_STATUS_STYLES` has no `pending` key** — pre-probe state maps to `warning` and is indistinguishable from a real warning (`ProviderInstanceCard.tsx:220-221` + `providerStatus.ts:8-21`). PR 2.
11. **`PROVIDER_STATUS_STYLES` has no `headless-restricted` key** — the runtime warning from `AntigravityAdapter.ts:669-678` has no surface. PR 2.
12. **Custom Gateway data-model drift** — `claudeService` flag vs `ANTHROPIC_BASE_URL` env var; selecting "Custom" in the UI does not route through Custom. PR 5.
13. **Panel-level `lastCheckedAt` reduce** averages across drivers and is wrong on a per-instance edit page (`ProviderSettingsPanel.tsx:431-438`). PR 6.
14. **4-segment status bar / "Currently powering" / "Used N× today" / health-check countdown** — decoration. Out.
15. **Hardcoded `bg-emerald-500/10 text-emerald-600`** at `UniversalServiceSettings.tsx:185-190`. PR 4.
16. **2-click arm-then-confirm delete flow** at `ProviderInstanceEditPage.tsx:332-343`. PR 9.

## 11. Open questions

- **Mode flag name** — `claudeService` is Claude-only today. Rename to `serviceMode` so OpenCode, Cursor, etc. can use the same surface? Hold for a follow-up unless the answer is "yes, rename now".
- **`headless-restricted` severity** — block the "Enable this instance" toggle, or just warn? Today the adapter only emits a `runtime.warning` (informational). Recommend warn-only for MVS.
- **The `pending` badge** — static grey dot, or spinner? Recommend static dot; the spinner belongs on the Refresh button only.
- **`Provider.ping` / `testConnection` RPC** — there is no `provider.ping` or `testConnection` in `packages/contracts/src/rpc.ts:213-339`. The only related method is `serverRefreshProviders` at line 280. A real ping is out of scope for this spec; the blocking-error assertion in §3.2 is the smaller, honest replacement.
- **Display-name `DraftInput`** (`ProviderInstanceCard.tsx:573-587`) — keep, or move to a sidebar header? Today it's a hidden label trick that costs a screen reader. Hold.
- **Repeated Connection picker across instances.** If the user has 5+ Claude Code instances, the per-instance editor's Connection section repeats 5 times. Is there a "Default connection for this driver" shortcut at the harness level that instances fall back to? Hold; out of scope for this spec.

## 12. Out of scope

- The shell, chat, usage, skills, mobile shell.
- The database.
- The contracts beyond what's listed in §8.
- Server internals beyond the `ClaudeAdapter` mode dispatch.
- The `ProviderModelsSection.tsx:236` `max-h-40` fixed-height list (real bug, separate spec).
- Light-mode cleanup (rejected with the prior draft; not in this direction).
- A `lastUsedAt` field on `ServerProvider` (rejected with the decorative counter).
- A new `provider.ping` RPC (rejected — the blocking-error assertion is the honest fix).
