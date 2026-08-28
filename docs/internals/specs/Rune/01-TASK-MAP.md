# Task Map

Read `00-START-HERE.md` first.

| ID | Task | Depends on |
|---|---|---|
| T00 | [Baseline, safety, requirement ledger, and real-app gate](tasks/T00-baseline-safety-and-release-contract.md) | — |
| T01 | [Provider instances, service connections, runtime manifests, and multi-account routing](tasks/T01-provider-instances-and-runtime-routing.md) | T00 |
| T02 | [Antigravity lifecycle, recovery, real icon, and live verification](tasks/T02-antigravity-integration.md) | T00, T01 |
| T03 | [RUNE Native end-to-end harness](tasks/T03-rune-native-harness.md) | T00, T01 |
| T04 | [Execution controller: Queue, Steer, Pause, Continue, Stop, Edit, Delete](tasks/T04-execution-controller-queue-steer-edit.md) | T00 |
| T05 | [Structured composer asker and provider-neutral Grill UX](tasks/T05-structured-asker-and-grill-ux.md) | T00, T04 |
| T06 | [ASK → SPEC → PLAN → BUILD → REVIEW operating system](tasks/T06-plan-spec-and-orchestration.md) | T00, T01, T04, T05 |
| T07 | [RUNE Skill Registry + Matt Pocock engineering workflow integration](tasks/T07-skills-registry-and-mattpocock-pack.md) | T00, T05, T06 |
| T08 | [Codex-class real child-agent threads](tasks/T08-real-child-agent-threads.md) | T00, T01, T04 |
| T09 | [Codex-class live Agent Activity + Cursor-class change visibility](tasks/T09-live-agent-activity-and-diffs.md) | T00, T04 |
| T10 | [Thread/turn change ownership, checkpoints, rewind, and diff truth](tasks/T10-chat-scoped-change-ownership.md) | T00, T04, T08 |
| T11 | [Actions 2.0 + Learned Actions](tasks/T11-actions-and-learned-actions.md) | T00, T04, T06 |
| T12 | [Environment quick panel, right rail, files, servers, and action surfaces](tasks/T12-environment-files-panels-and-actions-surface.md) | T00, T10, T11 |
| T13 | [Provider management UX and settings cleanup](tasks/T13-settings-provider-management-ui.md) | T00, T01, T02, T03 |
| T14 | [Usage, Turn Trace, request accounting, and performance](tasks/T14-usage-turn-trace-and-performance.md) | T00, T03, T09 |
| T15 | [RUNE assets and canonical Provider Brand Registry](tasks/T15-brand-assets-and-provider-icons.md) | T00 |
| T16 | [Competitive feature harvest + future security architecture reservation](tasks/T16-competitive-harvest-and-future-security.md) | T00 |
| T17 | [Chat surface, dashboard shell, visual system, and anti-slop quality](tasks/T17-chat-surface-dashboard-shell-and-ui-quality.md) | T00, T04, T09, T12 |
| T18 | [Full regression matrix, benchmarks, packaged desktop verification, and reports](tasks/T18-verification-benchmarks-and-packaged-release.md) | T00, T01, T02, T03, T04, T05, T06, T07, T08, T09, T10, T11, T12, T13, T14, T15, T17 |
| T19 | [DABT-scale developer dogfood benchmark](tasks/T19-dabt-scale-dogfood.md) | T03, T04, T08, T09, T11, T14, T18 |
