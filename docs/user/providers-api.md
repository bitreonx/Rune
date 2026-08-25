# OpenAI-compatible API providers

T3 Code can connect directly to OpenRouter or an OpenAI-compatible API. This is a bring-your-own-key connection: Rune uses the key you enter for that provider instance and does not require a separate Rune model subscription.

## Add OpenRouter

Open Settings → Providers → Add provider instance, choose OpenRouter, and enter your API key. You can optionally set:

- a site URL and app name for OpenRouter attribution
- custom model IDs for models that are not returned by the catalog
- a display name when you use more than one OpenRouter account

After the first successful refresh, the model list includes the provider’s verified context window, output limit, modalities, tool support, reasoning metadata, and pricing fields when OpenRouter supplies them. Missing values stay unknown; Rune does not infer capabilities from a model name.

## Workspace tools

When an API session has a workspace directory, the native agent loop can use workspace-safe tools such as reading files, listing directories, searching contents, and applying an exact file edit. Read-only sandbox sessions never receive edit tools. Edit requests follow the session approval policy and appear in the same approval flow as other providers.

Command execution is only offered by a host that explicitly supplies a process runner. If it is unavailable, the `bash` tool is not advertised to the model.

Project instructions from `AGENTS.md` (or `CLAUDE.md` when `AGENTS.md` is absent) are included in a bounded prompt section for the session.

## Key safety

API keys are stored as sensitive provider credentials. Do not put a key in a model slug, project file, or workspace instruction. Use a separate provider instance when you need different keys, endpoints, or model defaults.
