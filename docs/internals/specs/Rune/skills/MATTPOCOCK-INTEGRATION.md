# Matt Pocock Skills — RUNE Integration Profile

Upstream: https://github.com/mattpocock/skills

Authoritative implementation: `../tasks/T07-skills-registry-and-mattpocock-pack.md`.

## Principles

- `grilling`: decision tree/frontier; facts are investigated, decisions go to the user.
- `grill-with-docs`: grilling plus domain-modeling/decision documentation.
- `to-spec`: synthesize settled understanding; do not interview again.
- `to-tickets`: tracer-bullet vertical slices with explicit blockers.
- `implement`: build agreed work with TDD/review gates.
- `code-review`: independent Spec and Standards axes.
- `wayfinder`: map huge/uncertain work before pretending a build plan exists.

## RUNE improvement

```text
skill decision
→ provider-native structured question
→ RUNE Structured Input Gateway
→ composer asker
→ structured answer
→ same provider turn continues
```

Never dump the skill's Markdown questionnaire into chat when structured asking is available.

## Dependency awareness

Examples:

```text
grill-me → grilling
grill-with-docs → grilling + domain-modeling
```

RUNE records dependencies explicitly.

## Upgrade strategy

```text
immutable upstream skill
+ RUNE adapter metadata
+ provider dialect
```

This permits clean upstream updates.
