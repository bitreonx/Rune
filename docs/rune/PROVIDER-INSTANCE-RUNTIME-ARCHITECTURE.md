# Provider Instance Runtime Architecture

RUNE separates provider identity from provider-instance configuration. The
composer selects a stable instance id; the server resolves that id to a
provider-neutral runtime manifest; the adapter receives the resolved manifest
and owns provider-specific process or HTTP details.

```text
client selection
  → typed providerInstanceId
  → server registry and environment authorization
  → immutable per-turn runtime manifest
  → provider adapter/session
  → attributed runtime events and Turn Trace
```

The manifest is the boundary for endpoint, credential reference, compatibility
profile, model, harness kind, and process isolation. Credentials are resolved
server-side and are never returned in manifests, traces, receipts, or action
history. A turn keeps its resolved instance pin for its lifetime, preventing a
settings change from silently moving an active conversation to another
account.

Adapters remain responsible for their native protocol and lifecycle, while
orchestration consumes the common contract in `packages/contracts`. Unsupported
capabilities are explicit adapter decisions rather than silent fallback to a
different provider. Child threads inherit the intended provider binding only
when the provider supports that operation; otherwise the server reports a
typed capability error.

Local, remote, relay, and tunnel clients all use the same WebSocket contract.
The client origin is never baked into development bundles; routing remains
single-origin so a remote browser can resolve `/api`, `/ws`, and OAuth paths
through its connected RUNE server.

The runtime manifest and focused adapter fixtures provide code-side coverage.
Authenticated provider turns, multi-account remote sessions, and packaged
desktop behavior still require live acceptance on the target environment.
