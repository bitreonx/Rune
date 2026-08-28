# RUNE Native E2E status — retry attribution checkpoint

Date: 2026-08-28

This is a scoped T03 evidence checkpoint for the Native request-budget retry
repair. It is not a claim that the complete T03 end-to-end gate has passed.
Unverified capabilities are intentionally not promoted to working status here.

| Capability | Status | Evidence |
| --- | --- | --- |
| Native provider request budget | WORKING_FIXTURE | `ApiAgentLoop.test.ts` proves four tool-requesting round trips stop at the hard cap. Retry admission still calls `tryStartRequest()`. |
| Native retry request attribution | WORKING_FIXTURE | The transient-failure fixture proves the successful retry emits request number `2`, request id `turn-agent-loop:request:2`, and `retry: true`. |
| Native duplicate safe-read dedupe | WORKING_FIXTURE | `ApiToolScheduler.test.ts` proves equivalent marked safe reads execute once and fan out the same observation to both original call IDs. |
| Native ordered mutations | WORKING_FIXTURE | `ApiToolScheduler.test.ts` gives multiple mutations the same dedupe key and proves they still execute serially in model order without overlap. |
| Direct API execution path | WORKING_FIXTURE | `ApiAdapter.test.ts` exercises the OpenAI-compatible `/chat/completions` path with an OpenRouter-shaped provider fixture. |
| Complete Native T03 acceptance battery | PARTIAL | Request attribution, safe-read dedupe, and ordered-mutation fixture slices are verified; live-provider, packaged-desktop, and the remaining interaction gates are not certified here. |

## Verification command

The repository-prescribed `vp` command was unavailable in the shell. The
equivalent direct Vitest invocation initially discovered duplicate tests under
`.claude/worktrees` and `worktrees/cross-thread-intelligence`; excluding those
unrelated copies produced the clean result:

```text
node_modules/.bin/vitest.CMD run apps/server/src/provider/Layers/ApiToolScheduler.test.ts apps/server/src/provider/Layers/ApiAgentLoop.test.ts apps/server/src/provider/Layers/ApiRequestBudget.test.ts apps/server/src/provider/Layers/ApiAdapter.test.ts --exclude worktrees/** --exclude .claude/**
4 passed, 27 tests passed
```
