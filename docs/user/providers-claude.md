# Claude

This guide is for people who want to use more than one Claude setup in RUNE. For Codex, see
[Codex](./providers-codex.md). For first-time setup, see [Install RUNE](./install.md).

Common reasons:

- use separate work and personal Claude accounts
- try a different Claude Code configuration without disturbing your main setup
- run Claude through a router such as Claude Code Router
- use external providers exposed through a Claude-compatible workflow

## I Only Use One Claude Account

Use the default provider.

Log in with Claude Code normally:

```bash
claude auth login
```

In RUNE Settings, your Claude provider can stay like this:

```text
Display name: Claude
Binary path: claude
CLAUDE_CONFIG_DIR path: empty
```

An empty `CLAUDE_CONFIG_DIR path` means RUNE uses Claude Code's normal config directory.

When you set this field, RUNE points Claude Code at that directory with the
`CLAUDE_CONFIG_DIR` environment variable. It does not change `HOME`, so your system keychain and
the rest of your environment stay as they are.

## Where Claude Skills Are Loaded

RUNE looks for Claude skills in the Claude config directory's `skills` folder, then
`<workspace>/.agents/skills`, then `<workspace>/.claude/skills`.

If the same skill name exists in more than one folder, the later folder wins.

## I Want Work And Personal Claude Accounts

Use a different Claude config directory for each account.

Example:

```text
default config dir           work account
~/.claude_personal_home      personal account
```

### Set Up The First Account

Log in normally:

```bash
claude auth login
```

In RUNE Settings:

```text
Display name: Claude Work
Binary path: claude
CLAUDE_CONFIG_DIR path: empty
```

### Set Up The Second Account

Log in with a separate config directory:

```bash
mkdir -p ~/.claude_personal_home
CLAUDE_CONFIG_DIR=~/.claude_personal_home claude auth login
```

Use `CLAUDE_CONFIG_DIR`, not `HOME`. Setting `HOME` writes the login to
`~/.claude_personal_home/.claude`, which is not where RUNE looks.

Then add another Claude provider in RUNE:

```text
Display name: Claude Personal
Binary path: claude
CLAUDE_CONFIG_DIR path: ~/.claude_personal_home
```

Use the email shown in Settings to confirm each provider is using the intended account. Emails are
blurred by default; click the blurred email to reveal it.

## Can I Switch Claude Accounts In An Existing Thread?

Usually, no.

RUNE only offers Claude providers that use the same config directory for an existing thread. A
different config directory is treated as a different Claude environment.

This is different from the recommended Codex setup. Claude Code keeps account and local state across
multiple files under its config directory, so RUNE keeps separate config directories isolated
instead of trying to share part of the state.

## Configure A Claude-Compatible Service

Use the **Claude Code service** section on any Claude provider card when you want Claude Code to
talk to Anthropic, OpenRouter, or another Anthropic-compatible gateway. The setting belongs to the
provider instance, so it applies to every project using that provider on the same RUNE server.

Choose one of these services:

- **Anthropic**: leave the base URL blank and use Claude Code's normal login, or enter an
  `ANTHROPIC_API_KEY`.
- **OpenRouter**: RUNE fills in `https://openrouter.ai/api` and uses your OpenRouter key as the
  compatible service token.
- **Custom compatible service**: enter the gateway's base URL and API key or token.

RUNE stores credentials as server-side secrets. The key is never written to the project
repository and is shown as redacted after saving. The managed service variables are kept out of the
advanced environment editor so they cannot accidentally conflict with the selected service.

### Configure OpenRouter

Add or edit a Claude provider in RUNE Settings, then expand its card:

```text
Display name: Claude OpenRouter
Binary path: claude
CLAUDE_CONFIG_DIR path: ~/.claude_openrouter_home
Claude Code service: OpenRouter
API key: sk-or-...
```

If you prefer to inspect the generated environment, the OpenRouter selection is equivalent to:

```text
ANTHROPIC_BASE_URL   https://openrouter.ai/api
ANTHROPIC_AUTH_TOKEN sk-or-...                Sensitive
ANTHROPIC_API_KEY                              Empty value
```

If you want this setup isolated from your normal Claude account, create that home first:

```bash
mkdir -p ~/.claude_openrouter_home
```

If you previously used the same Claude home with a normal Anthropic login, run `/logout` in a Claude
Code session for that home before using OpenRouter. Otherwise Claude Code may keep using cached
Anthropic credentials instead of the OpenRouter token.

### Pick OpenRouter Models

The **Models** section on the same provider card shows models reported by the provider. Use **Add
custom model** to add any model ID the gateway accepts, and use the visibility control to hide or
show a model in the composer for every project using that provider. Favorites and ordering are
global to that provider instance too.

OpenRouter can also route Claude Code's default model roles to OpenRouter model IDs. Add these in
the provider's **Advanced environment variables** section if you want stable role-specific choices:

Example:

```text
ANTHROPIC_DEFAULT_OPUS_MODEL    anthropic/claude-opus-4.6
ANTHROPIC_DEFAULT_SONNET_MODEL  anthropic/claude-sonnet-4.6
ANTHROPIC_DEFAULT_HAIKU_MODEL   anthropic/claude-haiku-4.5
CLAUDE_CODE_SUBAGENT_MODEL      anthropic/claude-sonnet-4.6
```

Add those to the same provider's **Advanced environment variables** section if you want stable model
choices.

When the selected model is a custom model, RUNE pins Claude Code's `opus`, `sonnet`, and `haiku`
roles to that model for you. Gateways do not necessarily serve the first-party Anthropic models
those roles resolve to, and subagents plus background tasks use them for their first request —
without the pin they can fail immediately with a billing error. Environment variables you configure
yourself always win over the automatic pins.

### Verify OpenRouter Is Being Used

Open a Claude session and run:

```text
/status
```

You should see the Anthropic base URL set to:

```text
https://openrouter.ai/api
```

You can also check the OpenRouter activity dashboard for requests from your API key.

### Common OpenRouter Mistakes

- Use `https://openrouter.ai/api`, not `https://openrouter.ai/api/v1`, for Claude Code.
- Set `ANTHROPIC_AUTH_TOKEN` to your OpenRouter API key.
- Set `ANTHROPIC_API_KEY` to an empty string so Claude Code does not try to use an Anthropic login.
- Put these variables on the Claude provider instance, not in global shell startup files. The
  **Claude Code service** section manages the base URL and credentials; use **Advanced environment
  variables** only for additional Claude Code settings such as model-role overrides.

OpenRouter's setup can change over time. Use its upstream Claude Code guide for the current details:
<https://openrouter.ai/docs/guides/guides/claude-code-integration>.

## I Want To Use Claude Code Router

Claude Code Router is useful when you want a local routing layer with more control than a direct
OpenRouter setup.

RUNE does not need a special Claude Code Router provider. Treat the router as a Claude
environment: give a Claude provider its own `CLAUDE_CONFIG_DIR path`, and put whatever variables
the router tells you to export into that provider's Environment variables section. Mark tokens
and API keys as sensitive.

```text
Display name: Claude Router
Binary path: claude
CLAUDE_CONFIG_DIR path: ~/.claude_router_home
```

Follow the upstream project's README for the router's own install, startup, and configuration
steps: <https://github.com/musistudio/claude-code-router>.

## I Want Different Claude Settings, Not A Different Account

Create another Claude provider with the same account if you want a named preset.

Examples:

- "Claude Default"
- "Claude Router"
- "Claude Experimental"

If the preset needs different Claude files, give it a different `CLAUDE_CONFIG_DIR path`. If it needs
different API keys, base URLs, or router settings, use Environment variables.

Do not put environment variable assignments in `Launch arguments`.
