import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import { PocketCommand } from "./pocket.ts";

const decodeCommand = Schema.decodeUnknownSync(PocketCommand);

describe("Pocket file reference contract", () => {
  it("accepts a workspace-relative path", () => {
    expect(
      decodeCommand({
        type: "pocket.file-referenced",
        pocketId: "pocket-a",
        environmentId: "environment-a",
        relativePath: "src/components/App.tsx",
      }),
    ).toMatchObject({ relativePath: "src/components/App.tsx" });
  });

  it.each(["/outside.txt", "C:\\outside.txt", "..\\outside.txt", "src/../outside.txt"])(
    "rejects a non-relative path: %s",
    (relativePath) => {
      expect(() =>
        decodeCommand({
          type: "pocket.file-referenced",
          pocketId: "pocket-a",
          environmentId: "environment-a",
          relativePath,
        }),
      ).toThrow();
    },
  );
});
