# RUNE Foundation Architecture

**Status:** Approved foundation direction, first implementation slice in progress  
**Date:** 2026-08-24  
**Scope:** Shared web/runtime foundations and the Electron desktop shell; mobile is explicitly out of scope.

## Goal

Evolve the existing T3 Code-derived runtime into RUNE without replacing working execution, provider, project, Git, and surface infrastructure merely for branding. RUNE is project-first: a Project owns durable Threads, Provider Sessions, Agent Runtime state, Git state, Processes, Surfaces, and Project Memory. The web client and Electron desktop client consume the same typed server/runtime contracts.

## Non-negotiable boundaries

- `Project` is the durable workspace boundary; `Thread` is task history inside a project.
- `Thread` and `Provider Session` remain distinct. A thread may contain multiple provider sessions and handoff packets.
- `MODEL`, `AGENT`, `CAPABILITIES`, `TOOLS`, `PROJECT MEMORY`, and `CHAT HISTORY` are different concepts.
- Filesystem type comes from metadata (`isDirectory`, `isFile`, `isSymbolicLink`), never filename punctuation.
- Every project path is normalized, resolved against the project root, checked for relative containment after symlink resolution where applicable, and only then used.
- Renderer code is a view. Electron owns native processes, PTYs, windows, dialogs, and named IPC handlers.
- Observable work may be recorded; private model chain-of-thought is never persisted or exposed.
- Upstream MIT attribution and vendor identities remain intact. Product-owned UX, metadata, and runtime names use RUNE as each surface is migrated.

## Existing seams to reuse

- `apps/server/src/workspace/WorkspacePaths.ts` and `WorkspaceFileSystem.ts` already provide typed root validation and bounded file operations.
- `packages/contracts/src/project.ts` and `packages/contracts/src/rpc.ts` already define project entry, search, read, and write contracts.
- `apps/web/src/components/files/FileBrowserPanel.tsx` and `FilePreviewPanel.tsx` already provide the initial project file surface.
- `apps/web/src/components/RightPanelTabs.tsx`, `RightPanelSheet.tsx`, and the right-panel stores provide a surface-management seam.
- `apps/desktop/src/backend/DesktopBackendManager.ts` already owns per-instance child lifecycle and uses the shared HTTP readiness helper.
- `packages/shared/src/httpReadiness.ts` already centralizes retry and per-probe timeout behavior.

## First implementation slice: startup reliability

Electron must reveal a native boot window before backend readiness. The boot surface is best-effort, does not become the main renderer window, and is dismissed when the real web application has reached its first reveal trigger. The boot state is observable through stage-labelled logs and a bounded readiness failure. The readiness contract is:

- lightweight existing metadata endpoint for the backend process;
- 2 second maximum per HTTP probe;
- 30 second maximum readiness round;
- repeated bounded rounds only while the child process remains alive;
- captured PID, command context, port/base URL, stdout/stderr log location, last readiness cause, and exit status in diagnostics;
- user-visible recovery actions remain retry, diagnostics, and quit rather than a silent wait.

The first slice changes only the desktop boot/window/backend seam and its focused tests. It does not introduce a second server, a parallel browser, or a mobile implementation.

## Subsequent slices

1. Project metadata and root-confined filesystem operations become the canonical shared project boundary, including correct dot-directory visibility and bounded previews.
2. The web workspace becomes visibly RUNE: project home, persistent threads, surface manager, Files, Terminal, Browser, Diff, Git, Agents, Memory, Processes, Context, and Artifacts remain project-aware and keyboard accessible.
3. Durable work records add provider-session separation, budgets/governor decisions, structured project-channel messages, work ledger entries, work traces, handoff packets, and evidence-backed completion states.
4. Clean-build generation ordering, Electron runtime preparation, native-module rebuilds, packaging, launch smoke tests, and web/desktop focused verification become release gates.

Each slice must ship a focused test cycle and must not claim production readiness where live packaging, browser, device, or access evidence is missing.

## Verification boundary

Desktop startup work is proven with unit tests around the boot-window lifecycle, readiness timeout behavior, process diagnostics, and Electron security options, plus the narrowest desktop typecheck/build available in the checkout. Web workspace work is proven with focused component/state tests and a single integrated web pass when the user authorizes browser use. Mobile is not touched or used as evidence for this project.
