import type { APIRoute } from "astro";

import { buildRuneProjectFileJsonSchema } from "@rune/shared/runeProjectFile";

// Rendered at build time; published at https://rune.dev/schema/rune.json so
// rune.json files can reference it via "$schema" for editor/LSP support.
export const GET: APIRoute = () =>
  new Response(`${JSON.stringify(buildRuneProjectFileJsonSchema(), null, 2)}\n`, {
    headers: { "Content-Type": "application/json" },
  });
