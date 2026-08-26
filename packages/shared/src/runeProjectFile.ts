import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";

import { RUNE_PROJECT_FILE_SCHEMA_URL, RuneProjectFile } from "@rune/contracts";

import { fromLenientJson } from "./schemaJson.ts";

/** Codec for the checked-in `rune.json` project file. */
export const RuneProjectFileFromJson = fromLenientJson(RuneProjectFile);

const decodeRuneProjectFile = Schema.decodeExit(RuneProjectFileFromJson);

/** Decode `rune.json`, treating invalid or malformed files as absent. */
export function parseRuneProjectFile(contents: string): RuneProjectFile | null {
  const decoded = decodeRuneProjectFile(contents);
  return Exit.isSuccess(decoded) ? decoded.value : null;
}

/** Build the publishable JSON Schema document for `rune.json`. */
export function buildRuneProjectFileJsonSchema(): Record<string, unknown> {
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
