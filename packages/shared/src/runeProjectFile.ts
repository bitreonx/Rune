import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";

import { RuneProjectFile, RUNE_PROJECT_FILE_SCHEMA_URL } from "@rune/contracts";

import { fromLenientJson } from "./schemaJson.ts";

/**
 * Codec between the raw `rune.json` file contents (lenient JSONC string) and the
 * decoded {@link RUNEProjectFile}.
 */
export const RUNEProjectFileFromJson = fromLenientJson(RuneProjectFile);

const decodeRUNEProjectFile = Schema.decodeExit(RUNEProjectFileFromJson);

/**
 * Decode raw `rune.json` contents, treating invalid or malformed files as
 * absent. Clients use this to read optional defaults (scripts, thread env
 * mode) without surfacing decode errors to the user.
 */
export function parseRUNEProjectFile(contents: string): RuneProjectFile | null {
  const decoded = decodeRUNEProjectFile(contents);
  return Exit.isSuccess(decoded) ? decoded.value : null;
}

/**
 * Build the publishable JSON Schema document for `rune.json` (draft 2020-12).
 *
 * Served from the marketing site at {@link RUNE_PROJECT_FILE_SCHEMA_URL} so
 * editors get LSP support via a `$schema` reference.
 */
export function buildRUNEProjectFileJsonSchema(): Record<string, unknown> {
  const document = Schema.toJsonSchemaDocument(RuneProjectFile);
  const jsonSchema: Record<string, unknown> = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: RUNE_PROJECT_FILE_SCHEMA_URL,
    ...document.schema,
  };
  if (document.definitions && Object.keys(document.definitions).length > 0) {
    jsonSchema.$defs = document.definitions;
  }
  return jsonSchema;
}

// Keep the normal Rune camel-case spelling available to the new client
// surfaces while retaining the established acronym exports for compatibility.
export const parseRuneProjectFile = parseRUNEProjectFile;
export const buildRuneProjectFileJsonSchema = buildRUNEProjectFileJsonSchema;
