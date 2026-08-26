import { EnvironmentId, ThreadId, TurnId } from "@rune/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

const testState = vi.hoisted(() => ({
  codeViewItems: null as ReadonlyArray<unknown> | null,
  diffState: {
    data: null as { diff: string } | null,
    error: null as string | null,
    isPending: false,
  },
}));

vi.mock("@pierre/diffs/react", () => ({
  CodeView: (props: { items: ReadonlyArray<unknown> }) => {
    testState.codeViewItems = props.items;
    return null;
  },
}));

vi.mock("../../state/queries", () => ({
  useCheckpointDiff: () => testState.diffState,
}));

import { ChangedFilesCard, ChangedFilesTree } from "./ChangedFilesTree";

const environmentId = EnvironmentId.make("environment-local");
const threadId = ThreadId.make("thread-1");

describe("ChangedFilesCard", () => {
  it("keeps its compact header sticky while preserving singular labels", () => {
    const markup = renderToStaticMarkup(
      <ChangedFilesCard
        environmentId={environmentId}
        threadId={threadId}
        checkpointTurnCount={3}
        turnId={TurnId.make("turn-1")}
        files={[{ path: "README.md", kind: "modified", additions: 2, deletions: 1 }]}
        expanded
        showCompactPreview={false}
        allDirectoriesExpanded
        resolvedTheme="light"
        onExpandedChange={() => {}}
        onToggleAllDirectories={() => {}}
        onOpenTurnDiff={() => {}}
      />,
    );

    expect(markup).toContain('data-changed-files-state="expanded"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("whitespace-nowrap");
    expect(markup).toContain('class="group flex min-w-0 flex-1 items-center rounded-xl');
    expect(markup).not.toMatch(/class="group flex min-w-0 flex-1 items-center[^"]*overflow-hidden/);
    expect(markup).toContain('class="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"');
    expect(markup).toContain('class="flex shrink-0 items-center gap-1 whitespace-nowrap');
    expect(markup).toContain('class="ml-1 hidden min-w-0 flex-1 truncate');
    expect(markup).toContain("@[24rem]/changed-files:inline");
    expect(markup).not.toContain("sm:inline");
    expect(markup).toContain('class="flex shrink-0 items-center gap-1.5 pr-1"');
    expect(markup).toContain("!size-[22px]");
    expect(markup).toContain("size-3");
    expect(markup).toContain('aria-label="Collapse all folders"');
    expect(markup).toContain('aria-label="Open diff"');
    expect(markup).toContain('role="group" aria-label="2 additions, 1 deletions"');
    expect(markup).toContain("1 changed file");
    expect(markup).not.toContain("1 changed files");
  });

  it("renders a scope and representative-file preview for a large latest change", () => {
    const markup = renderToStaticMarkup(
      <ChangedFilesCard
        environmentId={environmentId}
        threadId={threadId}
        checkpointTurnCount={3}
        turnId={TurnId.make("turn-1")}
        files={[
          { path: "apps/web/src/App.tsx", kind: "modified", additions: 120, deletions: 20 },
          { path: "apps/web/src/App.test.tsx", kind: "modified", additions: 30, deletions: 2 },
          {
            path: "packages/shared/src/git.ts",
            kind: "modified",
            additions: 15,
            deletions: 4,
          },
          { path: "README.md", kind: "modified", additions: 3, deletions: 0 },
        ]}
        expanded={false}
        showCompactPreview
        allDirectoriesExpanded={false}
        resolvedTheme="light"
        onExpandedChange={() => {}}
        onToggleAllDirectories={() => {}}
        onOpenTurnDiff={() => {}}
      />,
    );

    expect(markup).toContain('data-changed-files-state="preview"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("apps");
    expect(markup).toContain("2 files");
    expect(markup).toContain("packages");
    expect(markup).toContain("root");
    expect(markup).toContain("App.tsx");
    expect(markup).toContain("git.ts");
    expect(markup).toContain("README.md");
    expect(markup).toContain("Show all 4 files");
    expect(markup).not.toContain("App.test.tsx");
  });

  it("opens a preview file in the explorer when an explorer handler is provided", () => {
    const markup = renderToStaticMarkup(
      <ChangedFilesCard
        environmentId={environmentId}
        threadId={threadId}
        checkpointTurnCount={3}
        turnId={TurnId.make("turn-1")}
        files={[{ path: "apps/web/src/App.tsx", kind: "modified", additions: 2, deletions: 1 }]}
        expanded={false}
        showCompactPreview
        allDirectoriesExpanded={false}
        resolvedTheme="light"
        onExpandedChange={() => {}}
        onToggleAllDirectories={() => {}}
        onOpenTurnDiff={() => {}}
        onOpenFile={() => {}}
      />,
    );

    expect(markup).toContain('data-file-path="apps/web/src/App.tsx"');
    expect(markup).toContain('aria-label="Open file App.tsx"');
  });

  it("keeps older collapsed changes to a one-line receipt", () => {
    const markup = renderToStaticMarkup(
      <ChangedFilesCard
        environmentId={environmentId}
        threadId={threadId}
        checkpointTurnCount={3}
        turnId={TurnId.make("turn-1")}
        files={[{ path: "apps/web/src/App.tsx", kind: "modified", additions: 120, deletions: 20 }]}
        expanded={false}
        showCompactPreview={false}
        allDirectoriesExpanded={false}
        resolvedTheme="light"
        onExpandedChange={() => {}}
        onToggleAllDirectories={() => {}}
        onOpenTurnDiff={() => {}}
      />,
    );

    expect(markup).toContain('data-changed-files-state="collapsed"');
    expect(markup).toContain("1 changed file");
    expect(markup).not.toContain("Show all");
    expect(markup).not.toContain("App.tsx");
  });
});

describe("ChangedFilesTree", () => {
  it.each([
    {
      name: "a compacted single-chain directory",
      files: [
        { path: "apps/web/src/index.ts", kind: "modified", additions: 2, deletions: 1 },
        { path: "apps/web/src/main.ts", kind: "modified", additions: 3, deletions: 0 },
      ],
      visibleLabels: ["apps/web/src"],
      hiddenLabels: ["index.ts", "main.ts"],
    },
    {
      name: "a branch point after a compacted prefix",
      files: [
        {
          path: "apps/server/src/git/Layers/GitCore.ts",
          kind: "modified",
          additions: 4,
          deletions: 3,
        },
        {
          path: "apps/server/src/provider/Layers/CodexAdapter.ts",
          kind: "modified",
          additions: 7,
          deletions: 2,
        },
      ],
      visibleLabels: ["apps/server/src"],
      hiddenLabels: ["git", "provider", "GitCore.ts", "CodexAdapter.ts"],
    },
    {
      name: "mixed root files and nested compacted directories",
      files: [
        { path: "README.md", kind: "modified", additions: 1, deletions: 0 },
        { path: "packages/shared/src/git.ts", kind: "modified", additions: 8, deletions: 2 },
        {
          path: "packages/contracts/src/orchestration.ts",
          kind: "modified",
          additions: 13,
          deletions: 3,
        },
      ],
      visibleLabels: ["README.md", "packages"],
      hiddenLabels: ["shared/src", "contracts/src", "git.ts", "orchestration.ts"],
    },
  ])(
    "renders $name collapsed on the first render when collapse-all is active",
    ({ files, visibleLabels, hiddenLabels }) => {
      const markup = renderToStaticMarkup(
        <ChangedFilesTree
          turnId={TurnId.make("turn-1")}
          files={files}
          allDirectoriesExpanded={false}
          resolvedTheme="light"
          onOpenTurnDiff={() => {}}
          environmentId={environmentId}
          threadId={threadId}
          checkpointTurnCount={2}
          expandedFilePath={null}
          onExpandedFilePathChange={() => {}}
        />,
      );

      for (const label of visibleLabels) {
        expect(markup).toContain(label);
      }
      for (const label of hiddenLabels) {
        expect(markup).not.toContain(label);
      }
    },
  );

  it.each([
    {
      name: "a compacted single-chain directory",
      files: [
        { path: "apps/web/src/index.ts", kind: "modified", additions: 2, deletions: 1 },
        { path: "apps/web/src/main.ts", kind: "modified", additions: 3, deletions: 0 },
      ],
      visibleLabels: ["apps/web/src", "index.ts", "main.ts"],
    },
    {
      name: "a branch point after a compacted prefix",
      files: [
        {
          path: "apps/server/src/git/Layers/GitCore.ts",
          kind: "modified",
          additions: 4,
          deletions: 3,
        },
        {
          path: "apps/server/src/provider/Layers/CodexAdapter.ts",
          kind: "modified",
          additions: 7,
          deletions: 2,
        },
      ],
      visibleLabels: [
        "apps/server/src",
        "git/Layers",
        "provider/Layers",
        "GitCore.ts",
        "CodexAdapter.ts",
      ],
    },
    {
      name: "mixed root files and nested compacted directories",
      files: [
        { path: "README.md", kind: "modified", additions: 1, deletions: 0 },
        { path: "packages/shared/src/git.ts", kind: "modified", additions: 8, deletions: 2 },
        {
          path: "packages/contracts/src/orchestration.ts",
          kind: "modified",
          additions: 13,
          deletions: 3,
        },
      ],
      visibleLabels: [
        "README.md",
        "packages",
        "shared/src",
        "contracts/src",
        "git.ts",
        "orchestration.ts",
      ],
    },
  ])(
    "renders $name expanded on the first render when expand-all is active",
    ({ files, visibleLabels }) => {
      const markup = renderToStaticMarkup(
        <ChangedFilesTree
          turnId={TurnId.make("turn-1")}
          files={files}
          allDirectoriesExpanded
          resolvedTheme="light"
          onOpenTurnDiff={() => {}}
          environmentId={environmentId}
          threadId={threadId}
          checkpointTurnCount={2}
          expandedFilePath={null}
          onExpandedFilePathChange={() => {}}
        />,
      );

      for (const label of visibleLabels) {
        expect(markup).toContain(label);
      }
    },
  );
});

describe("ChangedFilesTree inline diffs", () => {
  it("expands a file row into its inline diff instead of leaving the chat", () => {
    testState.diffState = {
      data: {
        diff: [
          "diff --git a/README.md b/README.md",
          "index 1111111..2222222 100644",
          "--- a/README.md",
          "+++ b/README.md",
          "@@ -1,1 +1,2 @@",
          " context",
          "+added",
        ].join("\n"),
      },
      error: null,
      isPending: false,
    };

    const markup = renderToStaticMarkup(
      <ChangedFilesTree
        turnId={TurnId.make("turn-1")}
        files={[{ path: "README.md", kind: "modified", additions: 1, deletions: 0 }]}
        allDirectoriesExpanded
        resolvedTheme="light"
        onOpenTurnDiff={() => {}}
        environmentId={environmentId}
        threadId={threadId}
        checkpointTurnCount={2}
        expandedFilePath="README.md"
        onExpandedFilePathChange={() => {}}
      />,
    );

    expect(markup).toContain('aria-expanded="true"');
    expect(testState.codeViewItems).toHaveLength(1);
  });

  it("marks the expanded row and keeps other rows collapsed", () => {
    const markup = renderToStaticMarkup(
      <ChangedFilesTree
        turnId={TurnId.make("turn-1")}
        files={[
          { path: "README.md", kind: "modified", additions: 1, deletions: 0 },
          { path: "src/app.ts", kind: "modified", additions: 2, deletions: 0 },
        ]}
        allDirectoriesExpanded
        resolvedTheme="light"
        onOpenTurnDiff={() => {}}
        environmentId={environmentId}
        threadId={threadId}
        checkpointTurnCount={2}
        expandedFilePath="src/app.ts"
        onExpandedFilePathChange={() => {}}
      />,
    );

    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-expanded="true"');
  });
});

describe("ChangedFilesCard revert", () => {
  const baseProps = {
    environmentId,
    threadId,
    checkpointTurnCount: 3,
    turnId: TurnId.make("turn-1"),
    files: [{ path: "README.md", kind: "modified", additions: 2, deletions: 1 }],
    expanded: false,
    showCompactPreview: false,
    allDirectoriesExpanded: false,
    resolvedTheme: "light" as const,
    onExpandedChange: () => {},
    onToggleAllDirectories: () => {},
    onOpenTurnDiff: () => {},
  };

  it("offers an undo action when the caller can revert", () => {
    const markup = renderToStaticMarkup(
      <ChangedFilesCard {...baseProps} onRevertTurn={() => {}} />,
    );

    expect(markup).toContain('aria-label="Undo this turn"');
  });

  it("omits the undo action while the turn is still running", () => {
    const markup = renderToStaticMarkup(
      <ChangedFilesCard {...baseProps} onRevertTurn={() => {}} revertDisabled />,
    );

    expect(markup).toContain('aria-label="Undo this turn"');
    expect(markup).toContain("disabled");
  });

  it("omits the undo action entirely when reverting is unavailable", () => {
    const markup = renderToStaticMarkup(<ChangedFilesCard {...baseProps} />);

    expect(markup).not.toContain('aria-label="Undo this turn"');
  });
});
