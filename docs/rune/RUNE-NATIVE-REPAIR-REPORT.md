# RUNE Native repair report — retry attribution

Date: 2026-08-28

## Scope

This report covers only the T03 Native request-budget/direct-API retry
attribution defect. It does not certify the complete Native harness or modify
the shared Rune task status.

## Root cause

`runAgenticTurn` admitted the retry through `ApiRequestBudget.tryStartRequest`,
but later emitted `api.request.usage` using the first admission's request
number and `retry: false`. A successful retry therefore consumed budget without
being represented accurately in the request trace.

## Repair

The loop now keeps the request number and retry flag for the actual admitted
attempt. The retry still has to pass both the one-retry policy and
`tryStartRequest`, so it cannot bypass the four-request hard budget. The usage
request id is derived from the actual request number.

## Fixture evidence

Focused regression coverage in
`apps/server/src/provider/Layers/ApiAgentLoop.test.ts` verifies that one
transient failure followed by success results in:

```text
requestId: turn-agent-loop:request:2
requestNumber: 2
retry: true
```

The same focused suite retains the four-round budget exhaustion test. The
direct adapter fixture in `ApiAdapter.test.ts` continues to exercise direct
OpenAI-compatible routing without an external harness process.

## Safe-read and mutation scheduling evidence

The Native scheduler now accepts an explicit `dedupeKey` only for tools marked
`dedupeSafeRead`. Equivalent safe reads execute once, then the scheduler fans
the observation back out by each original tool-call ID while retaining model
order in the returned observations. Interactive, verification, and mutating
tools do not receive this key.

Mutating calls remain a separate serial phase and ignore read dedupe keys. The
focused scheduler regression gives both mutations the same key, holds the
first mutation open, and proves the second does not start until the first
completes; the final order is `write-1`, `write-2`.

## Verification

```text
vp test run ...
blocked: `vp` is not installed in this shell

pnpm exec vitest run ...
blocked before discovery: existing react-native-screens patch application failure

node_modules/.bin/vitest.CMD run apps/server/src/provider/Layers/ApiToolScheduler.test.ts apps/server/src/provider/Layers/ApiAgentLoop.test.ts apps/server/src/provider/Layers/ApiRequestBudget.test.ts apps/server/src/provider/Layers/ApiAdapter.test.ts --exclude worktrees/** --exclude .claude/**
passed: 4 test files, 27 tests
```

`git diff --check` also passed for the changed source/test files.

## Remaining T03 verification

Live provider credentials, packaged-desktop execution, and the remaining Native
ask/approval/control/recovery/performance gates remain unverified by this
repair checkpoint.
