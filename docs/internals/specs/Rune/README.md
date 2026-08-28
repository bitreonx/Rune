# RUNE MASTER SPEC v4.0

Start with `00-START-HERE.md`.

This package is intentionally modular. Agents load one task plus declared dependencies rather than the archived monolithic master.

Key v4 additions:

- every harness/provider question converges on the RUNE composer-native Structured Input Gateway;
- Codex/Claude/etc. use their structured question mechanism instead of printing Grill questionnaires when supported;
- suggested answers are selectable and editable, with custom free-form answers;
- the existing RUNE asker must be redesigned as part of the composer family;
- Matt Pocock's engineering skills are imported through the RUNE Skill Registry, dependency-aware and progressively loaded;
- upstream skills are adapted, not directly edited;
- the Environment quick popover is explicitly specified;
- v3.6 is archived for audit, not default context.
