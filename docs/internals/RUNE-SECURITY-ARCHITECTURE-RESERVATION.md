# RUNE Security architecture reservation

Status: reservation only. No Security product, scanner, findings database, or
visible Security navigation is implemented by this document.

Research/design boundary: T16, 2026-08-28.

## Purpose

Reserve a provider-neutral path for a future first-class RUNE Security subsystem
without creating dormant product code or locking the system to one model vendor.
The future subsystem should be another consumer of normal RUNE work, not a second
orchestration engine.

## Current seams to reuse

- **Execution and identity:** durable thread/turn IDs, provider-instance routing,
  runtime task attribution, and adapter capability boundaries in
  `packages/contracts/src/orchestration.ts`, `packages/contracts/src/providerInstance.ts`,
  `packages/contracts/src/providerRuntime.ts`, and
  `apps/server/src/provider/Layers/ProviderService.ts`.
- **Isolation and differential scope:** project/worktree context, checkpoints,
  turn diffs, full-thread diffs, and review inputs in
  `packages/contracts/src/environment.ts`, `packages/contracts/src/orchestration.ts`,
  `packages/contracts/src/review.ts`, and `apps/server/src/checkpointing/`.
- **Evidence and verification:** cross-thread claims/citations and the existing
  mutation-aware API harness evidence ledger in
  `packages/contracts/src/crossThread.ts` and
  `apps/server/src/provider/Layers/ApiHarness.ts`.
- **Inspectable execution:** activities, runtime receipts, usage/trace state,
  approvals, and normal Environment projections. Security work must remain
  inspectable through these surfaces rather than inventing a private transcript.
- **Background compatibility:** scoped background leases and client liveness in
  `packages/contracts/src/background.ts`; future triggers must still create normal
  attributable turns and results.

These seams are reservations, not a claim that they already satisfy a security
scanner's acceptance criteria.

## Future conceptual model

When a later task authorizes implementation, a finding may reference an evidence
chain such as:

```text
source → flow → sink → preconditions → attack path → observation
        → validation → severity rationale → fix → fix verification
```

The future model should prefer references to existing files, lines, symbols,
turns, tool observations, checkpoints, diffs, and verification receipts over large
copied payloads. Any new contract must define ownership, project/thread scope,
retention, redaction, and invalidation before it is persisted.

Likely future lifecycle, subject to a later contract review:

```text
candidate → validated | false_positive | accepted_risk
          → fixed → fix_verified
          ↘ regressed
```

This is a design reservation, not a new union in `packages/contracts`.

## Provider-neutral execution rules

1. Discovery, validation, and review may use different configured provider
   instances only when the capability registry says each role is supported.
2. A provider/model is execution metadata, never the identity of a finding,
   evidence item, or task.
3. Provider-native security features may be adapted at the adapter boundary, but
   the RUNE result must retain a normalized status and attributable evidence.
4. Security-sensitive work must support local execution boundaries where possible.
   Secrets must be redacted from activity, trace, capsules, exports, and review
   payloads; the existing `ApiHarness` redaction behavior is a useful seam, not a
   complete policy.
5. Independent discovery workers, if later needed, must use normal child threads,
   isolation, receipts, and result adoption. Do not create a security-specific
   worker protocol.
6. Differential review should reuse checkpoint/diff targets and must distinguish
   working-tree, branch, commit, and PR scope. Raw `git status` is not finding or
   ownership evidence.
7. A patch is not a fix verification. The future closure path must record a
   post-fix validation result and make later mutations able to invalidate it.

## Explicit non-goals for T16

- no scanner, rule engine, attack-path engine, threat-model editor, or advisory
  ingestion;
- no dormant security tables or migration placeholders;
- no Security sidebar item, route, dashboard, settings toggle, or TODO button;
- no new provider-specific security API contract;
- no claim of secure, production-ready, or live-verified behavior from this
  reservation.

## Follow-up gate

A future implementation task should first demonstrate that the authorized
contract can represent a scoped finding and its evidence without duplicating
thread, diff, receipt, or verification state. It should then add focused contract
tests and an end-to-end local scenario before any user-visible Security surface is
considered.
