# Antigravity

RUNE can run Google's Antigravity CLI as a first-class provider. For first-time setup, see
[Install RUNE](./install.md).

## Install and sign in

Install the CLI from the [official Antigravity CLI install guide](https://antigravity.google/docs/cli/install/).
On Windows PowerShell, the official installer is:

```powershell
irm https://antigravity.google/cli/install.ps1 | iex
```

Confirm that the server machine can find the CLI:

```bash
agy --version
agy models
```

Run `agy` interactively once on the machine running RUNE and complete the sign-in flow. RUNE
then discovers the models reported by `agy models`. If the CLI is installed but not authenticated,
the Antigravity provider stays visible in Settings with a login hint instead of being treated as a
missing provider.

## Configure RUNE

The default provider uses:

```text
Provider: Antigravity
Binary path: agy
```

Change **Binary path** in Settings if the CLI is installed outside the server process's `PATH`.
The model picker uses the live `agy models` catalog and exposes Antigravity's `low`, `medium`, and
`high` effort values when the selected model supports them.

Changing the model or effort starts a new Antigravity session because the headless stream binds
those values when `agy` starts.

RUNE persists the `conversation_id` reported by the CLI and passes it back with
`--conversation` when it recreates the process. This keeps the provider conversation intact across
server restarts and normal runtime recovery. The first turn also waits for the CLI initialization
event, so a fast user message cannot be lost while `agy` is starting.

## Permissions and interruptions

Antigravity's headless stream does not expose an interactive approval response channel to RUNE.
RUNE therefore does not pretend that its approval modes can approve an Antigravity tool call,
and leaves the CLI's permission policy in charge for approval-required, auto-accept-edits, and auto
sessions. When the RUNE runtime is explicitly set to **full access**, RUNE passes
`--dangerously-skip-permissions` so the provider matches that requested mode; see the
[headless CLI documentation](https://antigravity.google/docs/cli/headless/) before enabling it.

Stopping or interrupting a turn terminates the Antigravity process, but the last durable
conversation id remains available. A later turn recreates the process and continues that provider
conversation when the CLI can resolve the id.
