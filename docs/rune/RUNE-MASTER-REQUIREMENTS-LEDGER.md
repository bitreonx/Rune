# RUNE T18 verification ledger

This ledger records what the verification lane can prove from deterministic
source/package checks and what still requires a live client, provider, or
packaged Windows run. A passing static gate is not treated as live-product
evidence.

| ID | Area | Evidence in this checkout | Status |
|---|---|---|---|
| T18-74 | Test strategy | `scripts/check-t18-verification.ts` requires focused verification seams; targeted tests are listed in the benchmark report. | VERIFIED_COMPLETE |
| T18-75 | Queue/message | Runtime acceptance requires a live client walkthrough; no browser/dev-server run was authorized. | BLOCKED_WITH_EVIDENCE |
| T18-76 | Activity | Existing focused activity/trace tests are covered by the surface gate; semantic live rendering remains unverified. | BLOCKED_WITH_EVIDENCE |
| T18-77 | Goals | Existing goal tests are not a substitute for reload/rerender UI evidence. | BLOCKED_WITH_EVIDENCE |
| T18-78 | Grill/asker | Composer-native asker behavior requires live client evidence. | BLOCKED_WITH_EVIDENCE |
| T18-79 | Custom Gateway | Existing settings tests are covered by the gate; persisted selection and chosen-gateway request remain unverified. | BLOCKED_WITH_EVIDENCE |
| T18-80 | Antigravity | Fixture/server coverage exists in the current tree; all health headlines/recovery actions require live client/provider verification. | BLOCKED_WITH_EVIDENCE |
| T18-81 | File browser | Runtime expansion, context-menu, and focus behavior require live client evidence. | BLOCKED_WITH_EVIDENCE |
| T18-82 | Assets | `icons:check` remains wired, but the canonical export requires the platform Icon Composer and was not run here. | BLOCKED_WITH_EVIDENCE |
| T18-83 | Native harness | Request-budget and trace seams are covered; a native fixture/live turn was not run by this lane. | BLOCKED_WITH_EVIDENCE |
| T18-84 | Provider routing | Static focused test seams are required; cross-provider runtime routing remains unverified. | BLOCKED_WITH_EVIDENCE |
| T18-85 | Subagents | Persisted child-thread and stress behavior require a live client/runtime run. | BLOCKED_WITH_EVIDENCE |
| T18-86 | Accessibility | No browser/computer-use session was run; keyboard, focus, screen-reader, motion, and contrast evidence is open. | BLOCKED_WITH_EVIDENCE |
| T18-87 | Runtime narration | No new runtime/UI source was changed by this lane; review of product behavior remains with the owning agents. | OUT_OF_SCOPE_WITH_EXPLICIT_REASON |
| T18-88 | Final response quality | This ledger/report format preserves verified versus blocked claims. | VERIFIED_COMPLETE |
| T18-89 | Implementation ordering | Ordering is coordination policy, not a scripts/checks change. | OUT_OF_SCOPE_WITH_EXPLICIT_REASON |
| T18-90 | Parallelism policy | Concurrent worktree changes were preserved; no additional writer lane was started. | VERIFIED_COMPLETE |
| T18-91 | No fake completion | Reports use `BLOCKED_WITH_EVIDENCE` where live or packaged proof is absent. | VERIFIED_COMPLETE |
| T18-92 | Verification commands | Root scripts now expose encoding, performance-budget, surface, desktop-smoke, release-smoke, and Windows artifact commands; CI invokes focused gates. | VERIFIED_COMPLETE |
| T18-93 | Packaged desktop | Current desktop dist/release smoke seams are wired, but no current Windows installer/unpacked artifact launch or `rune://app` run was performed. | BLOCKED_WITH_EVIDENCE |
| T18-94 | Benchmark report | Required measurement schema is recorded without fabricated provider telemetry. | VERIFIED_COMPLETE |
| T18-95 | Implementation report | `docs/rune/RUNE-MASTER-IMPLEMENTATION-REPORT.md` records this lane's changes and blockers. | VERIFIED_COMPLETE |
| T18-96 | Completion gate | Multiple runtime and packaged conditions remain open; no release certification is claimed. | BLOCKED_WITH_EVIDENCE |
| T18-97 | Manual walkthrough | Browser/dev-server/computer-use execution was explicitly out of scope for this lane. | BLOCKED_WITH_EVIDENCE |
| T18-98 | Quality bar | Reports distinguish deterministic gate health from product acceptance. | VERIFIED_COMPLETE |
| T18-99 | Product principle | Product/runtime design is owned by other task lanes; this lane adds verification only. | OUT_OF_SCOPE_WITH_EXPLICIT_REASON |
| T18-100 | Final reporting | Benchmark, implementation, and ledger artifacts are present. | VERIFIED_COMPLETE |
| T18-289 | DABT dogfood | No DABT benchmark run was performed; the supplied checksum is not source and no live RUNE client run was authorized. | BLOCKED_WITH_EVIDENCE |
| T18-290 | DABT performance targets | No real-project telemetry was captured. | BLOCKED_WITH_EVIDENCE |
| T18-291 | Updated implementation order | Coordination policy is outside this lane's implementation scope. | OUT_OF_SCOPE_WITH_EXPLICIT_REASON |
| T18-292 | Antigravity report | Adapter/runtime report belongs to the Antigravity owner; this ledger records its live verification dependency. | OUT_OF_SCOPE_WITH_EXPLICIT_REASON |
| T18-293 | Provider brand report | Brand registry belongs to the brand/assets owner; this lane only retains the existing `icons:check` wiring. | OUT_OF_SCOPE_WITH_EXPLICIT_REASON |
| T18-294 | Native repair report | Native repair report belongs to the native harness owner; this lane records request-budget/trace gate evidence. | OUT_OF_SCOPE_WITH_EXPLICIT_REASON |
| T18-295 | Final blocking matrix | Static checks cannot close provider or packaged-app blockers. | BLOCKED_WITH_EVIDENCE |
| T18-296 | Reference URLs | No external implementation claim was made from these references. | OUT_OF_SCOPE_WITH_EXPLICIT_REASON |

## Deterministic gate commands

```text
pnpm check:encoding
pnpm check:performance
pnpm check:verification-surfaces
pnpm test:desktop-smoke
pnpm release:smoke
```

The Windows artifact command remains `pnpm dist:desktop:win:x64`; it builds and
validates a real package only on a supported packaging host with its required
native inputs. The final launch and `rune://app` walkthrough are intentionally
not marked complete from these source checks.
