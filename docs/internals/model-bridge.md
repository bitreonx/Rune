# Model bridge boundary

RUNE keeps native harnesses native. A cross-family model selection may use a
RUNE-managed localhost bridge only when the bridge proves the selected
protocol's streaming, tool, and usage semantics through its health contract.

The implementation provides the lifecycle boundary in
`apps/server/src/provider/ModelBridgeSupervisor.ts` and the strict health
parser in `apps/server/src/provider/ModelBridgeHealth.ts`. The default server
layer has no translator executable, so the provider instance registry passes
`bridgeAvailable: false` and rejects an unvalidated cross-family route before
creating a provider process. This is intentional and prevents a native CLI
from receiving the wrong protocol while the UI claims success.

## Implementation choice gate

Before enabling a bundled translator, maintainers must record evidence for:

- protocol coverage for Anthropic Messages, OpenAI Responses, and any
  OpenAI-compatible fallback;
- measured streaming/tool/usage latency overhead against direct native routes;
- license, notices, and dependency supply-chain review;
- updater and rollback behavior for the sidecar;
- Windows, macOS, and remote-server packaging behavior.

The supervisor already enforces the operational constraints that are independent
of the translator choice: loopback binding, per-instance config directories,
lazy startup, health validation, reference-counted cleanup, restart support,
and secret-free status/lease values. It does not expose a management endpoint
to the renderer or copy credentials into logs.
