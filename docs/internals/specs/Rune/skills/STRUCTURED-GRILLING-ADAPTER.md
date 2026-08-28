# RUNE Structured Grilling Adapter

Preserve the decision discipline of imported Grill skills while replacing chat-spam questionnaires with the RUNE composer asker.

## Transform

```text
Imported skill
"ask a decision and recommend an answer"
        ↓
RUNE Skill Compiler
        ↓
provider dialect
"emit structured user-input request"
        ↓
provider adapter
        ↓
UserInputRequest
        ↓
RUNE Composer
```

## Suggested answers

- up to 3 useful candidates when real alternatives exist;
- mark one Recommended only when evidence supports it;
- clicking a suggestion fills an editable answer field;
- user may edit it;
- user may write a completely custom answer.

## Facts vs decisions

Facts: RUNE researches.

Decisions: RUNE asks.

## Transcript

Normal:
`Needs you · Provider connection ownership`

Resolved:
`✓ Clarified provider connection ownership`

No giant question block.
