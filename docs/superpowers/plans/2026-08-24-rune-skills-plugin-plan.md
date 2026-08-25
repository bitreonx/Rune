# RUNE Skills and Scoped Plugins Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax (- [ ]) for tracking.

**Goal:** Add a truthful skills workspace and a server-authoritative plugin inventory with project and user scopes, while keeping provider-discovered skills and plugin capabilities distinct.

**Architecture:** First project existing ServerProviderSkill snapshots into a searchable skills page. Then add a typed plugin manifest, environment-scoped registry, permission review, and WebSocket RPC operations. The browser renders server state; it does not install, enable, or disable plugins through local storage.

**Tech Stack:** Effect/Schema contracts, WebSocket RPC, server settings/persistence, React/TanStack Router, provider snapshot atoms, Vitest.

**Spec:** docs/superpowers/specs/2026-08-24-rune-workbench-redesign-design.md

## Global Constraints

- Scope is web and desktop; mobile remains unchanged.
- Skills are sourced from real provider snapshots and preserve provider/environment scope.
- Plugins have explicit project or user scope and capability permissions.
- Browser-local state cannot claim that a plugin is installed or enabled.
- Plugin actions are enabled only when the server validates environment identity, filesystem boundary, and permission state.
- Do not expose unnecessary host paths, secrets, or plugin file contents in ordinary list payloads.

---

### Task 1: Build the skills projection and page

**Files:**
- Create: apps/web/src/skills/skillsWorkspace.logic.ts
- Create: apps/web/src/skills/skillsWorkspace.logic.test.ts
- Create: apps/web/src/components/skills/SkillsPage.tsx
- Create: apps/web/src/components/skills/SkillDetailPanel.tsx
- Create: apps/web/src/components/skills/SkillsPage.test.tsx
- Create: apps/web/src/routes/skills.tsx
- Modify: apps/web/src/components/sidebar/SidebarChrome.tsx
- Modify: apps/web/src/components/settings/SettingsSidebarNav.tsx only if the product keeps skills in the settings navigation
- Modify: apps/web/src/components/chat/ComposerCommandMenu.tsx only for a detail-page return link

**Interfaces:**
- SkillWorkspaceEntry contains provider instance id, environment id, name, display name, short description, scope, source kind, enabled state, and safe display path.
- buildSkillWorkspaceEntries(input: { environmentId: string; providers: ReadonlyArray<ServerProvider> }): SkillWorkspaceEntry[].
- filterSkillWorkspaceEntries(entries, query, filters) returns stable, ranked results using the existing provider skill search rules.

- [ ] **Step 1: Write projection tests**

~~~ts
const entries = buildSkillWorkspaceEntries({
  environmentId: "env-a",
  providers: [
    {
      instanceId: ProviderInstanceId.make("codex"),
      driver: ProviderDriverKind.make("codex"),
      skills: [{ name: "review", path: "/repo/.agents/skills/review/SKILL.md", scope: "project", enabled: true }],
      models: [],
      slashCommands: [],
      enabled: true,
      installed: true,
      status: "ready",
      auth: { status: "authenticated" },
    },
  ],
});
expect(entries[0]).toMatchObject({ name: "review", scope: "project", sourceKind: "project" });
~~~

- [ ] **Step 2: Run the focused skill tests and verify failure**

Run: pnpm.cmd --filter @t3tools/web test -- --run src/skills/skillsWorkspace.logic.test.ts src/components/skills/SkillsPage.test.tsx

Expected: FAIL because the projection and page do not exist.

- [ ] **Step 3: Implement the projection**

Reuse formatProviderSkillDisplayName, resolveProviderSkillSourceKind, and searchProviderSkills. Deduplicate only identical provider-instance/name/path tuples; do not collapse skills from different environments or providers.

- [ ] **Step 4: Implement the skills page and detail panel**

Add scope filters for project, repository, personal, app, system, and other. Show provider/environment badges, enabled/available state, safe source metadata, and a link/action that returns to the composer command path. Keep installation and enablement controls absent unless a provider exposes a real mutation contract.

- [ ] **Step 5: Add the route and navigation entry**

Add skills.tsx, update shell navigation, and let the route generator update generated metadata. Keep the page available in web and desktop through the shared shell.

- [ ] **Step 6: Verify skills behavior**

Run:

~~~powershell
pnpm.cmd --filter @t3tools/web test -- --run src/skills/skillsWorkspace.logic.test.ts src/components/skills/SkillsPage.test.tsx src/components/chat/ComposerCommandMenu.test.tsx src/providerSkillSearch.test.ts
pnpm.cmd --filter @t3tools/web typecheck
~~~

Expected: PASS.

### Task 2: Add plugin manifest and permission contracts

**Files:**
- Create: packages/contracts/src/plugin.ts
- Create: packages/contracts/src/plugin.test.ts
- Modify: packages/contracts/src/rpc.ts
- Modify: packages/contracts/src/index.ts if an explicit export barrel exists
- Modify: packages/contracts/src/settings.ts only if persisted plugin activation belongs in server settings

**Interfaces:**
- PluginScope is "project" | "user".
- PluginCapability is "tools" | "commands" | "skills" | "filesystem" | "network" | "terminal".
- PluginState is "installed" | "enabled" | "disabled" | "update-available" | "error".
- PluginManifest includes validated id, name, version, description, scope, source, capabilities, permissions, and state.
- RPC inputs include environmentId, optional projectId, plugin id, and requested operation.
- RPC outputs never include secret values or arbitrary plugin file contents.

- [ ] **Step 1: Write schema tests**

~~~ts
expect(decodePluginManifest({
  id: "superpowers",
  name: "Superpowers",
  version: "1.0.0",
  scope: "user",
  source: "local",
  capabilities: ["skills"],
  permissions: [],
  state: "installed",
})).toMatchObject({ id: "superpowers", scope: "user" });

expect(() => decodePluginManifest({
  id: "../escape",
  name: "Unsafe",
  version: "1.0.0",
  scope: "project",
  source: "local",
  capabilities: ["filesystem"],
  permissions: [],
  state: "installed",
})).toThrow();
~~~

- [ ] **Step 2: Run the focused contract test and verify failure**

Run: pnpm.cmd exec vp test run packages/contracts/src/plugin.test.ts

Expected: FAIL because the plugin schema does not exist.

- [ ] **Step 3: Implement schemas and RPC shapes**

Validate ids as slugs, versions as non-empty strings, scopes as literals, capabilities as a closed list, and permissions as explicit records with grant/revoke timestamps. Add list, install, enable, disable, update, remove, and permission-review RPC contracts with forward-compatible response arrays.

- [ ] **Step 4: Run contract tests**

Run: pnpm.cmd exec vp test run packages/contracts/src/plugin.test.ts

Expected: PASS.

### Task 3: Implement the server plugin registry

**Files:**
- Create: apps/server/src/plugins/PluginRegistry.ts
- Create: apps/server/src/plugins/PluginRegistry.test.ts
- Create: apps/server/src/plugins/PluginManifestReader.ts
- Create: apps/server/src/plugins/PluginManifestReader.test.ts
- Modify: apps/server/src/serverSettings.ts
- Modify: apps/server/src/ws.ts
- Modify: apps/server/src/server.ts
- Modify: packages/client-runtime/src/state/server.ts
- Modify: apps/web/src/state/server.ts

**Interfaces:**
- PluginRegistry.list(environmentId, projectId?): Effect<ReadonlyArray<PluginManifest>, PluginRegistryError>.
- PluginRegistry.install(input): Effect<PluginManifest, PluginRegistryError>.
- PluginRegistry.setEnabled(input): Effect<PluginManifest, PluginRegistryError>.
- PluginRegistry.remove(input): Effect<void, PluginRegistryError>.
- Every operation resolves an environment-owned root and rejects paths outside the configured project or user plugin roots.

- [ ] **Step 1: Write path and scope tests**

Test that a user plugin is visible for every project on the same environment, a project plugin is visible only for its project, and a traversal path is rejected:

~~~ts
expect(await registry.list("env-a", "project-a")).toEqual([userPlugin, projectAPlugin]);
expect(await registry.list("env-a", "project-b")).toEqual([userPlugin]);
await expect(registry.install({ environmentId: "env-a", projectId: "project-a", sourcePath: "../outside" }))
  .rejects.toMatchObject({ _tag: "PluginPathOutsideScope" });
~~~

- [ ] **Step 2: Run server plugin tests and verify failure**

Run: pnpm.cmd exec vp test run apps/server/src/plugins/PluginManifestReader.test.ts apps/server/src/plugins/PluginRegistry.test.ts

Expected: FAIL because the registry does not exist.

- [ ] **Step 3: Implement manifest discovery and scope enforcement**

Read only manifests from environment-owned user and project plugin roots. Normalize paths, validate manifest ids, and return safe metadata. Persist enabled state through the server-owned settings/persistence boundary. Do not execute plugin code as part of list or install.

- [ ] **Step 4: Implement RPC wiring and client atoms**

Add WebSocket handlers with the existing authorization/session checks. Expose environment-scoped atoms/commands through createServerEnvironmentAtoms. Stream updates or invalidate the list atom after a mutation so all connected web/desktop clients converge.

- [ ] **Step 5: Run focused server/client tests**

Run:

~~~powershell
pnpm.cmd exec vp test run apps/server/src/plugins/PluginManifestReader.test.ts apps/server/src/plugins/PluginRegistry.test.ts packages/contracts/src/plugin.test.ts packages/client-runtime/src/state/server.test.ts
~~~

Expected: PASS.

### Task 4: Build the plugins page and permission review

**Files:**
- Create: apps/web/src/plugins/pluginsWorkspace.logic.ts
- Create: apps/web/src/plugins/pluginsWorkspace.logic.test.ts
- Create: apps/web/src/components/plugins/PluginsPage.tsx
- Create: apps/web/src/components/plugins/PluginPermissionDialog.tsx
- Create: apps/web/src/components/plugins/PluginsPage.test.tsx
- Create: apps/web/src/routes/plugins.tsx
- Modify: apps/web/src/components/sidebar/SidebarChrome.tsx
- Modify: apps/web/src/components/settings/SettingsSidebarNav.tsx only if the final IA keeps plugins alongside settings

**Interfaces:**
- PluginsPage consumes environment id, optional project id, plugin list, and registry commands.
- PluginPermissionDialog receives a manifest and returns explicit grant/reject actions; it does not infer permission from a toggle.
- The page visibly separates This project and All projects for this environment.

- [ ] **Step 1: Write page logic tests**

~~~ts
expect(groupPluginsByScope([projectPlugin, userPlugin])).toEqual({
  project: [projectPlugin],
  user: [userPlugin],
});
expect(resolvePluginActionState({ state: "installed", permissions: [] })).toBe("review");
~~~

- [ ] **Step 2: Run the focused page test and verify failure**

Run: pnpm.cmd --filter @t3tools/web test -- --run src/plugins/pluginsWorkspace.logic.test.ts src/components/plugins/PluginsPage.test.tsx

Expected: FAIL because the page logic and components do not exist.

- [ ] **Step 3: Implement scoped inventory and controls**

Render installed, enabled, disabled, update-available, and error states from server data. Add install, enable, disable, update, and remove actions only when the corresponding server command is available. Require permission review before enabling a plugin with filesystem, network, terminal, or tool capabilities.

- [ ] **Step 4: Add navigation and route**

Add plugins.tsx, update the shared utility navigation, and ensure desktop uses the same route and environment-scoped commands.

- [ ] **Step 5: Verify plugin page behavior**

Run:

~~~powershell
pnpm.cmd --filter @t3tools/web test -- --run src/plugins/pluginsWorkspace.logic.test.ts src/components/plugins/PluginsPage.test.tsx
pnpm.cmd --filter @t3tools/web typecheck
~~~

Expected: PASS.

### Task 5: Skills/plugin gate

- [ ] **Step 1: Run all focused contract, server, client-runtime, and web tests from Tasks 1–4**

Expected: PASS with no secret values in snapshots or rendered markup.

- [ ] **Step 2: Verify environment and project scope in the retained web runtime**

Open Skills and Plugins from the sidebar, switch between two connected environments if available, select different projects, confirm user plugins remain global within one environment, confirm project plugins do not appear in another project, and reject a permission request. Verify the composer still shows real provider skills.

- [ ] **Step 3: Run scoped builds**

~~~powershell
pnpm.cmd --filter t3 build
pnpm.cmd --filter @t3tools/web build
~~~

Expected: PASS.

