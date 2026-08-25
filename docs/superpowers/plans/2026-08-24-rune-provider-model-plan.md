# RUNE Provider and Model Workspace Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax (- [ ]) for tracking.

**Goal:** Give RUNE a truthful provider workspace for IDE subscriptions, API endpoints, environments, and model customization, including working OpenAI API and OpenRouter adapters.

**Architecture:** Keep the existing provider-instance and environment settings as the persistence boundary. Add presentation helpers for connection categories and model policy, then add API drivers/adapters through the same ProviderDriver, ProviderAdapter, ProviderRegistry, and ServerProvider snapshot seams used by Codex, Claude, Cursor, Grok, and OpenCode.

**Tech Stack:** Effect, Schema, WebSocket RPC, provider driver/adapter registries, ServerSecretStore-backed sensitive environment variables, React/TanStack Router, Vitest.

**Spec:** docs/superpowers/specs/2026-08-24-rune-workbench-redesign-design.md

## Global Constraints

- Scope is web and desktop; mobile remains unchanged.
- Existing IDE/subscription provider behavior must remain compatible.
- API keys stay in the server secret boundary and are redacted in settings snapshots.
- OpenAI API and OpenRouter are not connected until their adapters can start a session, stream turns, report errors, and expose model snapshots.
- Model favorites, hidden models, ordering, custom models, and project defaults use existing settings fields where possible.
- Unsupported capabilities must be represented as unavailable, not silently ignored.

---

### Task 1: Add connection-category and model-presentation helpers

**Files:**
- Create: packages/contracts/src/providerConnection.ts
- Create: packages/contracts/src/providerConnection.test.ts
- Create: apps/web/src/providerWorkspace.ts
- Create: apps/web/src/providerWorkspace.test.ts
- Modify: packages/contracts/src/index.ts if the package uses an explicit export barrel
- Modify: apps/web/src/providerInstances.ts
- Modify: apps/web/src/providerModels.ts

**Interfaces:**
- ProviderConnectionCategory is "subscription" | "api" | "local" | "remote".
- ProviderWorkspaceSummary contains instanceId, driver, displayName, category, authStatus, enabled, availability, modelCount, defaultModel, and scope.
- classifyProviderConnection(input: { driver: ProviderDriverKind; config: unknown; environment?: ProviderInstanceEnvironment }): ProviderConnectionCategory.
- buildProviderWorkspaceSummary(input: { config: ProviderInstanceConfig; snapshot?: ServerProvider; modelPreferences?: unknown }): ProviderWorkspaceSummary.

- [ ] **Step 1: Write classification tests**

~~~ts
expect(classifyProviderConnection({ driver: ProviderDriverKind.make("codex"), config: {} })).toBe("subscription");
expect(classifyProviderConnection({ driver: ProviderDriverKind.make("openaiApi"), config: { baseUrl: "https://api.openai.com/v1" } })).toBe("api");
expect(classifyProviderConnection({ driver: ProviderDriverKind.make("openrouter"), config: { baseUrl: "https://openrouter.ai/api/v1" } })).toBe("api");
~~~

- [ ] **Step 2: Run the contract tests and verify the new cases fail**

Run: pnpm.cmd exec vp test run packages/contracts/src/providerConnection.test.ts apps/web/src/providerWorkspace.test.ts

Expected: FAIL because the new helpers do not exist.

- [ ] **Step 3: Implement the helpers**

Use the driver kind and normalized configuration only for category classification. Derive health, auth, availability, and model counts from the optional ServerProvider snapshot. Never include environment variable values in the returned summary.

- [ ] **Step 4: Verify contract decoding and helper tests**

Run the focused tests again. Expected: PASS.

### Task 2: Build the provider workspace settings UI

**Files:**
- Create: apps/web/src/components/settings/ProviderWorkspace.tsx
- Create: apps/web/src/components/settings/ProviderWorkspace.logic.ts
- Create: apps/web/src/components/settings/ProviderWorkspace.logic.test.ts
- Create: apps/web/src/components/settings/ModelSettingsPanel.tsx
- Create: apps/web/src/components/settings/ModelSettingsPanel.test.tsx
- Modify: apps/web/src/components/settings/ProviderSettingsPanel.tsx
- Modify: apps/web/src/components/settings/ProviderInstanceCard.tsx
- Modify: apps/web/src/components/settings/AddProviderInstanceDialog.tsx
- Modify: apps/web/src/components/settings/ProviderSettingsForm.tsx
- Modify: apps/web/src/components/settings/SettingsSidebarNav.tsx
- Modify: apps/web/src/components/settings/settingsSearch.ts
- Create: apps/web/src/routes/settings.models.tsx
- Modify: apps/web/src/routes/settings.providers.tsx

**Interfaces:**
- Provider workspace sections are connections, subscriptions, api, models, and diagnostics.
- ProviderWorkspace.logic.ts consumes environment presentations, provider snapshots, and settings; it returns sorted category groups without fetching or mutating data.
- ModelSettingsPanel consumes a provider instance plus its ServerProviderModel array and existing providerModelPreferences.

- [ ] **Step 1: Write grouping and model-policy tests**

~~~ts
const groups = groupProviderWorkspaceEntries(entries);
expect(groups.subscriptions.map((entry) => entry.instanceId)).toEqual(["codex_work"]);
expect(groups.api.map((entry) => entry.instanceId)).toEqual(["openrouter_main"]);

expect(applyModelPreferencePatch(["gpt-5", "gpt-4"], { hiddenModels: ["gpt-4"], modelOrder: ["gpt-4", "gpt-5"] }))
  .toEqual({ visible: ["gpt-5"], hidden: ["gpt-4"] });
~~~

- [ ] **Step 2: Run the focused UI logic tests and verify failure**

Run: pnpm.cmd --filter @t3tools/web test -- --run src/components/settings/ProviderWorkspace.logic.test.ts src/components/settings/ModelSettingsPanel.test.tsx

Expected: FAIL because the workspace helpers and panels do not exist.

- [ ] **Step 3: Implement category cards and model management**

Build the new page from existing SettingsSection, SettingsRow, ProviderInstanceCard, access-gated environment selection, and AddProviderInstanceDialog. Cards must show category, auth status, enabled state, environment, health, model count, and default model. Add model search, favorite, hide, reorder, custom-model entry, and reset actions using existing settings patches.

- [ ] **Step 4: Add the models route and navigation**

Add settings.models.tsx, update the settings navigation/search source, and let the TanStack route generator update generated route metadata during the normal web build. Do not hand-edit routeTree.gen.ts.

- [ ] **Step 5: Verify existing provider settings regressions**

Run:

~~~powershell
pnpm.cmd --filter @t3tools/web test -- --run src/components/settings/ProviderWorkspace.logic.test.ts src/components/settings/ModelSettingsPanel.test.tsx src/components/settings/ProviderInstanceCard.test.ts src/components/settings/ProviderSettingsForm.test.ts src/components/settings/ProviderSettingsPanel.logic.test.ts src/components/settings/AddProviderInstanceDialog.test.ts
pnpm.cmd --filter @t3tools/web typecheck
~~~

Expected: PASS.

### Task 3: Add OpenAI API and OpenRouter provider contracts and drivers

**Files:**
- Create: packages/contracts/src/apiProvider.ts
- Create: packages/contracts/src/apiProvider.test.ts
- Create: apps/server/src/provider/Drivers/OpenAiApiDriver.ts
- Create: apps/server/src/provider/Drivers/OpenRouterDriver.ts
- Create: apps/server/src/provider/Layers/OpenAiApiProvider.ts
- Create: apps/server/src/provider/Layers/OpenRouterProvider.ts
- Create: apps/server/src/provider/Layers/OpenAiApiAdapter.ts
- Create: apps/server/src/provider/Layers/OpenRouterAdapter.ts
- Create: apps/server/src/provider/Layers/OpenAiApiAdapter.test.ts
- Create: apps/server/src/provider/Layers/OpenRouterAdapter.test.ts
- Modify: apps/server/src/provider/builtInDrivers.ts
- Modify: apps/server/src/provider/builtInProviderCatalog.ts
- Modify: apps/server/src/provider/ProviderDriver.ts only if the existing driver shape requires a shared HTTP/API capability
- Modify: apps/server/src/provider/Layers/ProviderAdapterRegistry.ts
- Modify: apps/server/src/server.ts for required HTTP/secret layers

**Interfaces:**
- ApiProviderConfig contains a validated HTTPS base URL, optional organization/project metadata, and a model discovery policy; it never contains a plain API key.
- OpenAI API reads OPENAI_API_KEY from the sensitive provider instance environment.
- OpenRouter reads OPENROUTER_API_KEY from the sensitive provider instance environment and supports optional HTTP referer/title configuration.
- Both adapters implement the existing provider session/turn/event normalization path and return ServerProvider snapshots with model metadata and explicit unsupported capability flags.

- [ ] **Step 1: Write contract and adapter failure tests**

Test that:

~~~ts
expect(decodeApiProviderConfig({ baseUrl: "https://api.openai.com/v1" }).baseUrl).toBe("https://api.openai.com/v1");
expect(() => decodeApiProviderConfig({ baseUrl: "http://insecure.example" })).toThrow();
~~~

Add adapter tests for missing secret, successful model listing, streamed text deltas, provider error mapping, and cancellation.

- [ ] **Step 2: Run focused server/contract tests and verify failure**

Run:

~~~powershell
pnpm.cmd exec vp test run packages/contracts/src/apiProvider.test.ts apps/server/src/provider/Layers/OpenAiApiAdapter.test.ts apps/server/src/provider/Layers/OpenRouterAdapter.test.ts
~~~

Expected: FAIL because the contracts, drivers, and adapters do not exist.

- [ ] **Step 3: Implement configuration decoding and secret injection**

Reuse ProviderInstanceEnvironmentVariable with sensitive: true and the existing server settings redaction path. Add driver-specific configuration schemas that reject insecure or malformed endpoints, normalize trailing slashes, and preserve user-defined model ids.

- [ ] **Step 4: Implement model discovery and streaming adapters**

Follow the existing ProviderAdapter and ProviderDriver implementations as the shape boundary. Normalize OpenAI-compatible chat/completions responses into the existing provider events. Make unsupported approval, sandbox, or native skill capabilities explicit in the adapter capability result. Never log request headers or secret values.

- [ ] **Step 5: Register drivers and run focused server tests**

Run:

~~~powershell
pnpm.cmd exec vp test run packages/contracts/src/apiProvider.test.ts apps/server/src/provider/Layers/OpenAiApiAdapter.test.ts apps/server/src/provider/Layers/OpenRouterAdapter.test.ts apps/server/src/provider/Layers/ProviderAdapterRegistry.test.ts apps/server/src/provider/Layers/ProviderService.test.ts apps/server/src/serverSettings.test.ts
~~~

Expected: PASS.

### Task 4: Connect API providers to the web settings and composer

**Files:**
- Modify: apps/web/src/components/settings/ProviderSettingsForm.tsx
- Modify: apps/web/src/components/settings/AddProviderInstanceDialog.tsx
- Modify: apps/web/src/components/settings/ProviderInstanceCard.tsx
- Modify: apps/web/src/components/chat/ProviderModelPicker.tsx
- Modify: apps/web/src/components/chat/ModelPickerContent.tsx
- Modify: apps/web/src/providerInstances.ts
- Modify: apps/web/src/modelSelection.ts
- Modify: apps/web/src/components/settings/ProviderWorkspace.logic.test.ts
- Modify: apps/web/src/components/chat/composerProviderState.test.tsx

- [ ] **Step 1: Add API-specific form tests**

Assert that the API form shows endpoint and redacted secret state, while subscription forms continue to show their driver-specific fields. Assert that an unavailable API provider cannot be selected in the composer.

- [ ] **Step 2: Implement API form and secret redaction behavior**

Use the existing valueRedacted flow. Submitting an unchanged redacted field must preserve the server secret; entering a new key must mark it for replacement. Display a clear stored securely on environment status instead of the key.

- [ ] **Step 3: Implement composer capability filtering**

Use the returned ServerProvider snapshot and adapter capabilities to disable unsupported controls with an explanation. Keep API provider model selection and custom-model entries compatible with the existing ModelSelection shape.

- [ ] **Step 4: Run provider web tests**

Run:

~~~powershell
pnpm.cmd --filter @t3tools/web test -- --run src/components/settings/ProviderWorkspace.logic.test.ts src/components/settings/ProviderInstanceCard.test.ts src/components/settings/ProviderSettingsForm.test.ts src/components/chat/composerProviderState.test.tsx src/components/chat/modelPickerSearch.test.ts
pnpm.cmd --filter @t3tools/web typecheck
~~~

Expected: PASS.

### Task 5: Provider/model gate

- [ ] **Step 1: Run contract and server focused tests**

Run the exact contract, adapter, registry, service, and settings test files from Tasks 1 and 3.

- [ ] **Step 2: Build server and web packages**

~~~powershell
pnpm.cmd --filter t3 build
pnpm.cmd --filter @t3tools/web build
~~~

Expected: PASS.

- [ ] **Step 3: Verify real runtime states**

In the retained web runtime, verify an existing subscription provider, a disabled provider, an unavailable provider, a custom model, and an API provider with a redacted key. Confirm that the browser never displays the key and that the composer only offers models from the selected environment.

