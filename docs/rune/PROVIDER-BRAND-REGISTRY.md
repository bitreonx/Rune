# RUNE provider and brand registry

Date: 2026-08-28

This is the source-backed inventory for the provider identities currently
rendered by RUNE. The shared registry owns identity and accessibility labels;
each client owns the renderer appropriate to its platform.

## Shared identity registry

Canonical source: `packages/shared/src/providerBrands.ts`.

| Identity | Display name | Shared icon key | Source kind |
| --- | --- | --- | --- |
| `runeNative` | Rune Native | `rune` | RUNE |
| `codex`, `openaiApi`, `openai` | Codex / OpenAI | `openai` | provider/service |
| `claudeAgent`, `anthropic` | Claude Code / Anthropic | `claude` | provider/service |
| `antigravity`, `google`, `gemini` | Antigravity / Google / Gemini | `antigravity` or `google` | provider/service |
| `cursor` | Cursor Agent | `cursor` | provider |
| `grok`, `xai` | Grok / xAI | `grok` or `xai` | provider/service |
| `opencode` | OpenCode | `opencode` | provider |
| `openrouter` | OpenRouter | `openrouter` | service |
| `deepseek` | DeepSeek | `deepseek` | service |
| custom OpenAI-compatible | Custom OpenAI-compatible | `openai` | service |
| custom Anthropic-compatible | Custom Anthropic-compatible | `claude` | service |

Unknown identities resolve to no icon rather than being misrepresented as
Codex/OpenAI.

## Client renderers

- Web: `apps/web/src/components/chat/providerIconUtils.ts` maps shared icon
  keys to the existing in-app SVG components. Provider artwork files that need
  stable public URLs live under `apps/web/public/logos/` and are documented in
  that directory's README.
- Mobile: `apps/mobile/src/components/ProviderIcon.tsx` maps the same shared
  keys to `react-native-svg`, with theme-aware monochrome marks and the
  provider's branded color where appropriate.
- Desktop: application chrome and packaged resources use the canonical RUNE
  assets resolved by `apps/desktop/src/app/DesktopAssets.ts` and
  `scripts/lib/brand-assets.ts`.

## RUNE application assets

`BRAND_ASSET_PATHS` in `scripts/lib/brand-assets.ts` is the canonical mapping
for development, nightly, and production desktop/web/mobile asset variants.
`icons:check` is the export/check command. Hosted web output uses the channel
mapping in `resolveWebAssetBrandForChannel`; a nightly channel cannot silently
reuse production favicon files.

## Provenance and remaining verification

The repository's asset README records which files are official artwork,
themeable vectors, or RUNE-owned marks. Exact upstream license URLs are not
currently encoded for every provider asset, so this document does not certify
license provenance beyond that repository metadata. The registry and focused
shared tests are verified; a packaged desktop icon audit and every platform's
visual screenshot remain release-gate work.
