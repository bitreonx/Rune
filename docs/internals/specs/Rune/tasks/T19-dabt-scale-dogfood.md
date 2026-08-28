---
task_id: T19
title: DABT-scale developer dogfood benchmark
status: TODO
depends_on: [T03, T04, T08, T09, T11, T14, T18]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T19 — DABT-scale developer dogfood benchmark

## Purpose

Prove RUNE accelerates a real large DABT-class repository safely, measuring time-to-first-useful-work, requests, parallelism, long-build visibility, repeated Actions, and provider recovery.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master sections 289–290.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


# 289. DABT developer-dogfood benchmark

RUNE is being developed to accelerate real DABT engineering work.

Treat a DABT-sized repository/workflow as an INTERNAL dogfood benchmark, not marketing copy.

Important:

The currently supplied:

```text
Dabt-Eco-main-IT-recovery-updated.zip.sha256
```

is only a checksum sidecar, not the DABT source archive.

Do not pretend to inspect DABT source from the checksum.

If the real DABT checkout/archive is available on the development machine, use SAFE representative tasks to verify RUNE:

```text
large repo mapping
focused bug investigation
small edit + verification
Plan Mode
parallel read-only reviewers
child threads
provider switch/handoff
RUNE Native
Learned Action
long-running build/test visibility
```

Preserve all DABT work.

Do not:

```text
reset
clean
destroy worktrees
rewrite unrelated code
```

The benchmark question is:

> Does RUNE measurably reduce time and supervision needed to develop a real large product?

---

---

# 290. DABT workload performance targets

On a real large project, verify:

```text
thread opens promptly
sidebar does not subscribe/render entire history
repo search is targeted
Native fast path remains bounded
child agents do not collide
long builds expose real stage/activity
repeated tasks become Actions
provider failures remain recoverable
```

Capture:

```text
time to first useful activity
time to first relevant file
time to first edit
request count
tool count
verification time
wall time
```

Do not optimize only synthetic hello-world fixtures.

---