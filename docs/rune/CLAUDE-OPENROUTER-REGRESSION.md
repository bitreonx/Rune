# Claude/OpenRouter Regression Report

## Observed old behavior

Selecting Claude through an OpenRouter-compatible gateway could leave the UI
identity, endpoint, session runtime, and trace provider out of sync. The
failure was especially easy to hide when the gateway was configured through
environment variables rather than a named provider instance.

## Reproduction

1. Configure a named Claude-compatible instance whose endpoint is an
   OpenRouter-compatible gateway.
2. Select that instance and start a turn.
3. Compare the composer selection, resolved runtime manifest, adapter request,
   and Turn Trace provider/instance fields.
4. Restart or resume the thread and repeat the comparison.

No credentials or authorization headers belong in a reproduction artifact.

## Redacted manifest diff

The repaired boundary is equivalent to:

```diff
- provider: "claude"
- endpoint: ambient environment
- instance: inferred from display label
+ provider: "claudeAgent"
+ endpoint: resolved from pinned providerInstanceId
+ instance: explicit named instance id
+ compatibilityProfile: versioned Claude/OpenRouter profile
```

## Root causes

- Provider driver kind and provider-instance identity were treated as the same
  selector in some paths.
- Gateway compatibility was inferred from scattered environment fields rather
  than compiled into a versioned runtime manifest.
- Resume and child-session paths did not consistently preserve the original
  instance pin.

## Fix

Provider-instance contracts, registry resolution, runtime manifest compilation,
session pinning, adapter routing, and identity guards now use the explicit
instance id. Configuration values remain server-owned, and compatibility
profiles are resolved before the adapter starts. The shared provider-brand
registry uses the same identity for labels and icons.

## Tests and verification

Focused provider-instance, registry, routing, and identity tests are present in
the server and contracts packages. Fixture verification is code-side only.
Authenticated Claude/OpenRouter turns, remote reconnect/resume, and packaged
desktop acceptance must still be run against real credentials and artifacts.
