# Antigravity integration repair

Date: 2026-08-28

## Scope and evidence boundary

This report records the lifecycle repair and fixture evidence currently in the
checkout. It does not claim a live authenticated Antigravity turn or packaged
desktop verification.

## Failure chain

The reported failure was an Antigravity adapter session lookup error followed
by a generic activity message that lost the provider's reason. The lifecycle
risk was a process exiting during initialization or between turns while the
in-memory adapter session was removed. A later `sendTurn` could then surface a
secondary unknown-session error instead of the original process failure.

## Current repair shape

`apps/server/src/provider/Layers/AntigravityAdapter.ts` now keeps lifecycle
state and generation checks around the session context, waits for readiness
before accepting a turn, preserves bounded stderr, and emits specific startup,
timeout, write, exit, and resume failures. The protocol boundary remains
provider-local in `apps/server/src/provider/antigravityProtocol.ts`.

The adapter also records the persisted conversation cursor, rejects a mismatched
conversation, prevents stale callbacks from mutating a replacement session,
and reports when the headless provider cannot support a requested control.

## Redacted lifecycle timeline

```text
session/start
  -> resolve agy command and spawn process
process/spawn
  -> attach bounded stdout/stderr readers and exit watcher
provider init
  -> await init event or report timeout/process/stderr reason
session state
  -> starting -> ready, or a specific failed state
send turn
  -> write one serialized user event only after readiness
failure projection
  -> preserve provider detail; do not replace it with SessionNotFound
```

## Fixture verification

- `apps/server/src/provider/antigravityProtocol.test.ts`: 8 tests passed.
- `apps/server/src/provider/Layers/AntigravityProvider.test.ts`: 7 tests passed.
- The adapter suite was not certified in this pass because its direct Vitest
  invocation did not complete within the available verification window.
- The locally installed `agy` CLI version/help/models probe was observed during
  the implementation pass; no account-backed turn was run.

## Remaining release gates

Live sign-in/model discovery, a successful first and second turn, the full
specific-state settings UI, and packaged desktop behavior still require an
authorized real-app verification pass.
