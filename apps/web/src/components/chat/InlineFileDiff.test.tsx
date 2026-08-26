import { EnvironmentId, ThreadId } from "@rune/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const testState = vi.hoisted(() => ({
  codeViewItems: null as ReadonlyArray<unknown> | null,
  codeViewOptions: null as Record<string, unknown> | null,
  diffState: {
    data: null as { diff: string } | null,
    error: null as string | null,
    isPending: false,
  },
}));

vi.mock("@pierre/diffs/react", () => ({
  CodeView: (props: { items: ReadonlyArray<unknown>; options: Record<string, unknown> }) => {
    testState.codeViewItems = props.items;
    testState.codeViewOptions = props.options;
    return null;
  },
}));

vi.mock("../../state/queries", () => ({
  useCheckpointDiff: () => testState.diffState,
}));

import { resolveDiffThemeName } from "../../lib/diffRendering";
import { InlineFileDiff } from "./InlineFileDiff";

const TWO_FILE_PATCH = [
  "diff --git a/src/app.ts b/src/app.ts",
  "index 1111111..2222222 100644",
  "--- a/src/app.ts",
  "+++ b/src/app.ts",
  "@@ -1,2 +1,2 @@",
  " context",
  "-old",
  "+new",
  "diff --git a/lib/util.ts b/lib/util.ts",
  "index 3333333..4444444 100644",
  "--- a/lib/util.ts",
  "+++ b/lib/util.ts",
  "@@ -1,1 +1,2 @@",
  " context",
  "+added",
].join("\n");

const environmentId = EnvironmentId.make("environment-local");
const threadId = ThreadId.make("thread-1");

describe("InlineFileDiff", () => {
  beforeEach(() => {
    testState.codeViewItems = null;
    testState.codeViewOptions = null;
    testState.diffState = { data: null, error: null, isPending: false };
  });

  it("renders only the requested file, headerless and unified", () => {
    testState.diffState = { data: { diff: TWO_FILE_PATCH }, error: null, isPending: false };

    renderToStaticMarkup(
      <InlineFileDiff
        environmentId={environmentId}
        threadId={threadId}
        checkpointTurnCount={3}
        filePaths={["src/app.ts"]}
        resolvedTheme="dark"
      />,
    );

    expect(testState.codeViewItems).toHaveLength(1);
    expect(testState.codeViewOptions).toMatchObject({
      diffStyle: "unified",
      disableFileHeader: true,
      theme: resolveDiffThemeName("dark"),
    });
  });

  it("renders every file in the turn when no file path is given", () => {
    testState.diffState = { data: { diff: TWO_FILE_PATCH }, error: null, isPending: false };

    renderToStaticMarkup(
      <InlineFileDiff
        environmentId={environmentId}
        threadId={threadId}
        checkpointTurnCount={3}
        filePaths={null}
        resolvedTheme="light"
      />,
    );

    expect(testState.codeViewItems).toHaveLength(2);
  });

  it("renders exactly the entry's files when several paths are given", () => {
    testState.diffState = { data: { diff: TWO_FILE_PATCH }, error: null, isPending: false };

    renderToStaticMarkup(
      <InlineFileDiff
        environmentId={environmentId}
        threadId={threadId}
        checkpointTurnCount={3}
        filePaths={["src/app.ts", "lib/util.ts"]}
        resolvedTheme="dark"
      />,
    );

    expect(testState.codeViewItems).toHaveLength(2);
  });

  it("shows a loading state while the turn diff is pending", () => {
    testState.diffState = { data: null, error: null, isPending: true };

    const markup = renderToStaticMarkup(
      <InlineFileDiff
        environmentId={environmentId}
        threadId={threadId}
        checkpointTurnCount={3}
        filePaths={["src/app.ts"]}
        resolvedTheme="dark"
      />,
    );

    expect(markup).toContain("Loading");
    expect(testState.codeViewItems).toBeNull();
  });

  it("shows the error and an escape hatch when the diff fails to load", () => {
    testState.diffState = { data: null, error: "Checkpoint unavailable", isPending: false };

    const markup = renderToStaticMarkup(
      <InlineFileDiff
        environmentId={environmentId}
        threadId={threadId}
        checkpointTurnCount={3}
        filePaths={["src/app.ts"]}
        resolvedTheme="dark"
      />,
    );

    expect(markup).toContain("Checkpoint unavailable");
    expect(testState.codeViewItems).toBeNull();
  });
});
