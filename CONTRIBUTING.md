# Contributing to RUNE

RUNE is early and intentionally selective about outside contributions. Small, focused bug fixes, reliability improvements, performance work, and maintenance changes are the best fit. For a substantial feature, open a discussion first so the direction and scope are clear.

## Development setup

RUNE uses pnpm 11 and Vite+ (`vp`). The root toolchain requires Node.js 24.13.1.

```bash
vp i
vp run dev
```

The repository contains the server, web client, Electron desktop app, mobile client, shared contracts/runtime, relay infrastructure, and native terminal components. Start the smallest surface that exercises your change:

```bash
vp run dev:server
vp run dev:web
vp run dev:desktop
```

Read [`AGENTS.md`](./AGENTS.md) and [`docs/internals/overview.md`](./docs/internals/overview.md) before changing server, RPC, provider, or orchestration code. The server owns provider processes, terminals, filesystem access, Git, and workspace state.

## Verification

Prefer focused proof:

```bash
vp test run path/to/changed.test.ts
vp run --filter @rune/web typecheck
vp run --filter rune typecheck
vp run lint:mobile
```

Do not run repository-wide checks for a narrowly scoped change unless the change requires them. CI runs the full suite. Backend behavior changes should include focused tests. Async server tests should await worker drains or typed receipts rather than sleeping.

For user-visible web changes, include one integrated client pass when practical. Mobile work must account for its native modules and Expo dev-client workflow; mobile is still in development and is not an official distributed app.

## Pull requests

- Keep one concern per change.
- Explain the user-facing problem and the smallest durable fix.
- Preserve unrelated dirty-worktree changes.
- Include focused verification commands and their results.
- Include before/after images for UI changes.
- Include a short video when motion or timing is part of the change.
- Do not include secrets, provider credentials, private project data, or PR-only screenshots in the repository.

We may close, defer, or rework a contribution. A clear, small, evidence-backed change is easiest to review.

## Scope boundaries

Avoid copying provider branding, store identifiers, signing identities, analytics keys, release infrastructure, or domains from upstream. Preserve required upstream attribution and third-party license notices. If a compatibility-sensitive inherited identifier must remain, document it in [`RUNE_UPSTREAM_AUDIT.md`](./RUNE_UPSTREAM_AUDIT.md).
