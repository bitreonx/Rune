import { describe, expect, it } from "vitest";

import { deletionConfirmationMessage, relativeEntryTarget } from "./fileBrowserActions";

describe("file browser action outcomes", () => {
  it("creates a child path for a directory", () => {
    expect(relativeEntryTarget({ kind: "directory", path: "src" }, "main.ts")).toBe("src/main.ts");
  });

  it("creates a sibling path for a file", () => {
    expect(relativeEntryTarget({ kind: "file", path: "src/main.ts" }, "app.ts")).toBe("src/app.ts");
  });

  it("uses a destructive confirmation message for recursive deletion", () => {
    expect(deletionConfirmationMessage({ kind: "directory", path: "src" })).toBe(
      "Delete src and everything inside it?",
    );
  });
});
