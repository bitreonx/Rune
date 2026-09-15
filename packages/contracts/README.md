# Contracts

Wire-level schemas and types shared by the RUNE server and clients.

## Public API groups

- `settings` — persisted and exchanged settings
- `relay` — relay protocol contracts
- `plan` — plan and plan-session contracts
- `promptQueue` — queued prompt contracts
- `mutation` — mutation and action contracts
- `handoff` — handoff contracts
- `baseSchemas` — reusable schema primitives

## Boundary

Contracts may depend only on schema/runtime libraries. They must not depend on
`@rune/shared`, `@rune/client-runtime`, React, filesystem APIs, provider
adapters, or application state.

Keep this package focused on data shape and validation. Derived presentation,
transport clients, persistence, and orchestration belong elsewhere.
