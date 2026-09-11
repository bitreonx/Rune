import { expect, it } from "@effect/vitest";
import { Tool } from "effect/unstable/ai";

import { RuneControlToolkit } from "./tools.ts";

it("exports the complete bounded schedule lifecycle toolkit", () => {
  const names = Object.keys(RuneControlToolkit.tools).sort();
  expect(names).toEqual([
    "rune_schedule_create",
    "rune_schedule_delete",
    "rune_schedule_list",
    "rune_schedule_pause",
    "rune_schedule_resume",
    "rune_schedule_run_history",
    "rune_schedule_run_now",
    "rune_schedule_update",
  ]);

  for (const tool of Object.values(RuneControlToolkit.tools)) {
    const schema = Tool.getJsonSchema(tool) as {
      readonly type?: unknown;
      readonly properties?: Readonly<Record<string, unknown>>;
      readonly additionalProperties?: unknown;
    };
    expect(schema.type, `${tool.name} must accept an object`).toBe("object");
    expect(schema.additionalProperties, `${tool.name} must reject unknown fields`).toBe(false);
    expect(tool.description?.length ?? 0, `${tool.name} needs a useful description`).toBeGreaterThan(
      40,
    );
    for (const [field, fieldSchema] of Object.entries(schema.properties ?? {})) {
      expect(
        typeof fieldSchema === "object" &&
          fieldSchema !== null &&
          typeof (fieldSchema as Record<string, unknown>).description === "string",
        `${tool.name}.${field} should describe its input`,
      ).toBe(true);
    }
  }

  const listSchema = Tool.getJsonSchema(RuneControlToolkit.tools.rune_schedule_list) as {
    readonly properties?: { readonly limit?: { readonly maximum?: unknown } };
  };
  expect(listSchema.properties?.limit?.maximum).toBe(100);

  const historySchema = Tool.getJsonSchema(RuneControlToolkit.tools.rune_schedule_run_history) as {
    readonly properties?: { readonly limit?: { readonly maximum?: unknown } };
  };
  expect(historySchema.properties?.limit?.maximum).toBe(100);
});

it("does not expose prompts or action parameters in success result schemas", () => {
  for (const tool of Object.values(RuneControlToolkit.tools)) {
    const schema = Tool.getJsonSchemaFromSchema(tool.successSchema);
    const serialized = JSON.stringify(schema);
    expect(serialized).not.toContain("parameters");
    expect(serialized).not.toContain("prompt");
  }
});
