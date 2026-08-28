---
task_id: T07
title: RUNE Skill Registry + Matt Pocock engineering workflow integration
status: TODO
depends_on: [T00, T05, T06]
source: RUNE master v3.6 + v4 authoritative decisions
---

# T07 — RUNE Skill Registry + Matt Pocock engineering workflow integration

## Purpose

Build one native skill registry, import the strongest current engineering skills, adapt them to RUNE's asker/planner/child-thread primitives, and load them progressively across every harness.

## Context-loading rule

When implementing this task, read:

1. `../00-START-HERE.md`
2. this file
3. only the dependency task files listed above
4. the exact repository files/tests named by this task

**Do not reread the archived monolithic master spec unless a conflict cannot be resolved from these files.**

## Source coverage

Master sections 42–47 and plan skill-pipeline requirements, plus authoritative v4 Matt Pocock integration.

## Completion rule

Existing code is not evidence of completion. Reproduce behavior, write/extend tests at the correct seam, implement the root-cause repair, verify the real UI/runtime, and update `../STATUS.md`.


# 42. Native Skills system — make it real

The latest checkout has only a small project skill set compared with the desired RUNE experience.

Build/finish a provider-neutral RUNE Skills Registry.

Discover compatible skills from:

```text
.agents/skills/
.cursor/skills/
.claude/skills/
.codex/skills/
supported user-global skill roots
```

without injecting every body into every prompt.

Use progressive disclosure.

---

---

# 43. Canonical skill metadata

At minimum:

```text
id
name
description
version
source
scope
paths
explicit-only / auto-invocable
aliases
required tools
optional tools
references
scripts
assets
license
compatibility
dependencies if RUNE supports them
```

Deduplicate the same skill discovered through multiple compatibility roots.

The composer screenshot must never show duplicate skill chips because the same capability was discovered twice.

---

---

# 44. Skill invocation

Support:

```text
/skill-name
@skill where RUNE already supports this convention
explicit skill picker
automatic activation when allowed
```

The UI shows active skills compactly.

Do not flood the composer with every available skill.

---

---

# 45. Native high-value coding skills

RUNE should ship/normalize a small high-value set rather than hundreds of filler skills.

Evaluate native RUNE equivalents for:

```text
systematic debugging
test-driven development
verification before completion
brainstorm / design discovery
grill-me
security review
performance investigation
frontend/design quality
accessibility review
code review
plan writing / execution
```

Do not force heavyweight process onto tiny tasks.

Activation depends on task complexity.

---

---

# 46. Integrate the external skill ecosystems intelligently

The user has previously identified:

```text
https://github.com/JuliusBrussee/caveman
https://github.com/petergyang/no-ai-slop
https://github.com/hardikpandya/stop-slop
https://github.com/affaan-m/ECC
https://github.com/pbakaus/impeccable
https://github.com/aws-samples/sample-apex-skills
```

Study the current versions and licenses.

Do not concatenate all prompts.

Extract reusable patterns into RUNE-native capabilities:

```text
context-efficient communication
anti-slop writing
anti-slop design
verification
workflow discipline
skill packaging
specialized references/scripts
```

If license terms do not permit direct code/content migration, reimplement the general idea without copying protected text/code.

Preserve notices when required.

---

---

# 47. Design anti-slop must be a runtime quality system

For UI work, do not rely on:

```text
"make it beautiful"
"don't make AI slop"
```

Activate relevant design guidance and verify the output.

Detect/avoid:

```text
card-in-card soup
random gradients
meaningless glass
giant radii everywhere
too many pills
weak hierarchy
template dashboard composition
low information density
duplicated labels
unnecessary icon noise
inconsistent spacing
bad responsive collapse
```

Then perform:

```text
render/browser check
responsive check
keyboard/focus check
accessibility check
visual hierarchy review
repair
```

---

---

# 153. Planning skill pipeline

Do not concatenate dozens of skills into the planner prompt.

RUNE selects a pipeline.

Guided Plan example:

```text
Understanding
→ native Grill / brainstorming principles

Specification
→ to-spec principles

Task slicing
→ tracer-bullet / to-tickets principles

Implementation
→ TDD / systematic debugging where relevant

Review
→ spec review + code review

Completion
→ verification-before-completion
```

Study useful current skill ecosystems such as:

```text
mattpocock/skills
superpowers
Caveman
ECC
Impeccable
no-ai-slop
APEX
```

Normalize useful principles into RUNE's native Skill Registry.

Respect licenses/attribution when directly adapting content.

Progressively load only activated skill bodies.

---

---

## Authoritative v4 Matt Pocock integration

Use current upstream:

```text
https://github.com/mattpocock/skills
```

Record installed upstream commit/version and preserve MIT attribution.

Do not inject the whole repository into every model prompt.

### Import/install profile

RUNE's Skill Registry should import the upstream pack through the official skills installer or equivalent Git-backed registry.

Verified upstream per-skill syntax currently uses:

```bash
npx skills add mattpocock/skills --skill=<skill-name>
```

Curated RUNE engineering profile:

```text
grilling
grill-me
grill-with-docs
domain-modeling
to-spec
to-tickets
implement
tdd
code-review
diagnosing-bugs
wayfinder
prototype
research
codebase-design
handoff
```

Do not assume alias/dependency resolution works automatically. Maintain explicit dependency metadata.

Examples:

```text
grill-me → grilling
grill-with-docs → grilling + domain-modeling
```

### Native RUNE adaptations

```text
grilling
→ RUNE decision DAG + Structured Input Gateway

grill-with-docs
→ grilling + domain-modeling + Decision/Glossary/ADR ledger

to-spec
→ synthesize settled decisions; DO NOT interview again

to-tickets
→ vertical tracer-bullet PlanTasks + dependency edges

implement
→ TDD/review gates persisted as execution state, not tail prose

code-review
→ independent Spec and Standards reviewers

wayfinder
→ Discovery Map for work too uncertain/large to honestly plan
```

### Skill compiler

At runtime compile only what is activated:

```text
skill body
+ RUNE platform capabilities
+ provider dialect
+ structured asker rule
+ active Plan/Goal
+ relevant tools
```

Never concatenate every installed skill.

### Explicit-only semantics

Respect upstream explicit-only / `disable-model-invocation` intent.

RUNE may auto-invoke an adapted workflow only when the user selected a RUNE mode/policy that authorizes it, e.g. Guided Plan.

### Upgrade safety

Never modify imported upstream files directly.

Keep:

```text
upstream skill
+ RUNE adapter metadata
```

separate.

### Required tests

- aliases resolve dependencies;
- duplicates across compatibility roots dedupe;
- one skill body injects once;
- explicit-only behavior is preserved;
- Structured Grill uses native composer asker;
- `to-spec` does not ask settled decisions again;
- `to-tickets` outputs vertical slices;
- implementation gates do not silently disappear late in long context;
- code review preserves separate Spec/Standards axes;
- provider switch does not change skill semantics.