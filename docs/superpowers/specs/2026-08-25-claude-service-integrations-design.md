# Claude Service Integrations & Subscription (IDE) Providers Redesign

**Date:** 2026-08-25
**Status:** Approved design, pending implementation plan
**Scope:** Web + desktop. Server: one new read-only HTTP endpoint.

## Problem

Routing Claude Code through OpenRouter (or any Anthropic-compatible gateway) is possible today,
but the flow is buried: Settings → Providers → Add provider instance → name it → save → expand
card → "Claude Code service" → pick preset → paste key → hand-type every model slug. Model IDs for
OpenRouter must be typed from memory. The badge on the Claude icon shows name initials, not which
service is in use. Separately, the Providers settings page accumulated two overlapping designs:
the recent "Provider workspace" section sits above the classic provider list, and model management
lives on a separate Models page — the same models, two places.

## Goals

1. One guided dialog creates an integration ("Claude Code via OpenRouter") with live catalog
   model picking and role mapping — reachable from Settings and from the chat composer.
2. The composer switches between main Claude and a service integration per project; the icon
   badge shows the service logo when one is active.
3. Settings shows a single "Subscription (IDE) Providers" section: cards in a 2-per-row grid;
   clicking a card opens a dedicated detail page holding integrations and model management.
4. Remove the duplicated designs: the Provider workspace section and the Models settings page.

## Non-goals

- API-key-first integrations (OpenRouter as a first-class harness driver). A separate section for
  these comes later; nothing here blocks it.
- Mobile presentation changes. Mobile inherits new instances/models through existing snapshots
  automatically; logos/badges on mobile come later.
- New persistence concepts. Integrations *are* provider instances; services are derived from
  their environment variables.

## Terminology

- **Subscription (IDE) provider** — a driver kind with CLI/subscription auth (Claude Code, Codex,
  Grok, OpenCode, Cursor).
- **Integration** — one configured instance of that driver (the default login, or a service-routed
  variant such as `claude_openrouter`).
- **Service** — where an integration's traffic goes, derived from its env: `anthropic`,
  `openrouter`, or `custom`.

---

## A. Settings restructure

**Removed**

- `ProviderWorkspace` section rendered at the top of the providers page
  (`apps/web/src/components/settings/ProviderSettingsPanel.tsx`) and its helpers
  (`apps/web/src/providerWorkspace.ts` + tests) once no longer referenced.
- `/settings/models` route (`ModelSettingsPanel.tsx`). The route file becomes a redirect to
  `/settings/providers` so stale deep links still land somewhere useful. Nav icon map, section
  labels, and settings-search entries updated; `routeTree.gen.ts` regenerates on build.
- `packages/contracts/src/providerConnection.ts` deleted if orphaned after the above (verify
  references before removing).

**Kept & enhanced**

- Section title: **"Subscription (IDE) Providers"**.
- Default-provider rows become cards in `grid gap-3 sm:grid-cols-2`. Card contents: provider
  logo, display name, auth/status chip, model count, enabled switch (writes the same patch as
  today), chevron affordance. Cursor keeps its install-conditional visibility.
- Devices selector and health-check interval row unchanged.
- Clicking a card navigates to `/settings/providers/$driver`; the param is the raw
  `ProviderDriverKind` string (e.g. `/settings/providers/claudeAgent`, `/settings/providers/codex`).

## B. Provider detail page

New route `/settings/providers/$driver`:

1. **Header** — logo, display name, live status/auth text, version-update button (existing
   candidate/update logic moves here), enabled toggle, breadcrumb back.
2. **Integrations** — one row per instance of the driver (synthesized default first, then custom
   instances in settings order). Row: instance icon with service-logo badge, display name,
   service subtitle ("Anthropic account" · "via OpenRouter" · "Custom gateway"), auth/status,
   enabled switch, Edit, Remove (non-default only). An **Advanced disclosure** per row exposes the
   existing card editor fields (binary path, config dir, advanced env) so no capability regresses.
   **"+ Add integration"** opens the guided dialog.
3. **Models** — existing `ProviderModelsSection` (search, favorite, hide/show, reorder, add custom
   model ID), with an integration picker when the driver has more than one instance. Custom-model
   entry stays manual here; the catalog picker lives in the guided dialog.

## C. Guided integration dialog

Single scrollable dialog with grouped sections (not a multi-page wizard):

1. **Service** — OpenRouter (base URL prefilled `https://openrouter.ai/api`) or Custom compatible
   service (base URL required).
2. **API key** — stored as a server-side secret via the existing environment-variable path;
   redacted after save, never displayed.
3. **Models** — "Fetch models" calls the catalog endpoint (below). Searchable checkbox list,
   `anthropic/*` entries sorted first and pre-suggested. Manual "add model ID" always available
   (gateways without a catalog, offline). Selected slugs persist to the instance's existing
   `config.customModels`.
4. **Roles (optional)** — Opus / Sonnet / Haiku selects populated from picked models; writes
   `ANTHROPIC_DEFAULT_OPUS_MODEL` / `_SONNET_` / `_HAIKU_` as plain (non-sensitive) env vars so
   subagents and background tasks resolve through the router.
5. **Name & accent** — auto-derived ("Claude OpenRouter", distinct accent color), editable.

Saving creates or updates a standard provider instance (id `claude_<slug>`, collision-suffixed).
Reopening Edit prefills from the same state the card editor reads.

## D. Composer

- Picker rail lists integrations under their driver with their models (already works).
- Trigger icon badge bottom-right shows the **service logo** when the active integration's env
  maps to `openrouter` or `custom`; initials otherwise. Same treatment on picker sidebar rows.
- A subtle **"+ Add service"** action at the end of the rail opens the guided dialog.
- Per-project enable/disable remains: selecting an integration sets that project's
  `defaultModelSelection`; selecting main Claude clears it there. No extra switch.

## E. Plumbing

### Catalog endpoint

- Contract: `HttpApiEndpoint.post("providerModelCatalog", "/api/providers/model-catalog")` in
  `EnvironmentHttpApi` (`packages/contracts/src/environmentHttp.ts`).
  Request `{ serviceId: "openrouter" | "custom", baseUrl?: string, instanceId?: string }`;
  response `{ models: ReadonlyArray<{ id: string; name?: string }> }`.
- Server layer follows the existing `HttpApiBuilder` group pattern. Key resolution: `instanceId`
  present → read the stored sensitive variable server-side; absent → unauthenticated fetch
  (OpenRouter's `/v1/models` is public). For `custom`, URL = provided `baseUrl`; reject non-HTTPS
  except loopback.
- Tolerant parser: accepts OpenAI `{ data: [{ id }] }`, Anthropic `{ data: [{ id, name }] }`, or a
  bare array; caps results (500) and strips empties/duplicates.
- In-memory cache keyed by service+URL, ~5-minute TTL, ~10 s request timeout. Failures return a
  typed error the dialog renders as "manual entry only". Keys are never logged or echoed.

### Service detection & assets

- Move the pure helpers out of `ClaudeServiceSettings.tsx` into `apps/web/src/claudeService.ts`
  (`readClaudeServiceEnvironment`, `buildClaudeServiceEnvironment`, presets) so settings and chat
  share one source of truth. Add `resolveClaudeServiceId(instanceEnv)` used by detail rows and
  badges.
- Vendor the OpenRouter mark into web assets (lobehub static PNG, dark + light variants, MIT;
  attribution comment beside the import) — bundled locally, never hot-linked. For `custom`
  services the badge falls back to a neutral globe glyph.
- `ProviderInstanceIcon` gains an optional `serviceBadgeSrc` prop rendering an image inside the
  existing bottom-right badge circle.

## Surfaces & docs

- Docs: rewrite `docs/user/providers-claude.md` around the guided flow (manual env path retained);
  remove Models-page references; add "integration" to `docs/internals/glossary.md`.
- Command palette / search entries pointing at `/settings/models` retargeted.
- Desktop inherits everything (wraps web).

## Error handling

Catalog fetch failure → inline dialog message, manual entry unaffected. Invalid base URL →
existing validation. Duplicate instance id → suffix like the add-instance wizard. Stored-secret
preservation on unchanged redacted fields → existing redaction flow. Disabled/deleted integration
while selected → existing fallback resolution in `providerInstances.ts`.

## Performance

One fetch on demand behind a button; short-TTL cache; no polling, no continuously repainting
animation added. Badge derivation is a pure function over already-loaded settings. No new
websocket traffic.

## Testing

Focused unit tests (no repo-wide runs):

- Catalog response parser: OpenAI shape, Anthropic shape, bare array, junk, empty, cap.
- Service detection: each preset + custom + anthropic from raw env arrays.
- Dialog env building incl. role-mapping variables (extends `ClaudeServiceSettings.test.ts`).
- Detail-page grouping/synthesis logic and grid card derivation.
- Badge mapping (env → logo source).

Verification: targeted `vp test run` for touched files + web typecheck; one integrated pass in the
web client before calling UI work done.
