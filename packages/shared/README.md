# Shared

Pure, cross-surface domain primitives and utilities used by the server, web,
desktop, mobile, relay, and tooling packages.

## Public API groups

| Group | Examples | Boundary |
| --- | --- | --- |
| Domain | `model`, `git`, `sourceControl`, `plan`, `actions` | Platform-neutral business types and rules |
| Transport and security | `remote`, `relay*`, `dpop*`, `oauthScope` | Protocol and authentication helpers |
| Runtime | `logging`, `observability`, `*Worker`, `shell` | Cross-runtime infrastructure abstractions |
| Presentation | `theme*`, `providerBrands`, `preview*`, `terminalLabels` | Shared display data and formatting |
| Composer and skills | `composer*`, `skillsIdentity`, `commandRegistry` | Shared authoring and skill metadata |
| Usage | `usage*`, `traceLedger` | Usage and execution reporting models |

## Dependency direction

`@rune/contracts` contains wire-level schemas and types. `@rune/shared` may
depend on contracts, but contracts must not depend on shared. Shared modules
must remain independent of React, browser globals, server orchestration, and
application state.

Consumers should import the narrowest existing subpath from `@rune/shared`.
The package currently exposes individual modules; future domain packages may
replace groups of these exports incrementally, with compatibility exports kept
during migration.

## Refactor rules

- Keep protocol schemas in `@rune/contracts`.
- Keep client state and connection supervision in `@rune/client-runtime`.
- Keep provider implementations in the provider packages or server adapters.
- Do not add application-specific behavior to this package.
