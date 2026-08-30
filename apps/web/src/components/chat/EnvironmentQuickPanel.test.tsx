import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  servers: [],
}));

vi.mock("../preview/useDiscoveredLocalServers", () => ({
  useDiscoveredLocalServers: () => mocks.servers,
}));

import { EnvironmentQuickPanel, resolveEnvironmentQuickSummary } from "./EnvironmentQuickPanel";

describe("EnvironmentQuickPanel", () => {
  it("exposes a labeled Summary control and the workspace/environment information model", () => {
    const html = renderToStaticMarkup(
      <EnvironmentQuickPanel
        environmentId={"env-1" as never}
        environmentLabel="Rune workspace"
        cwd="C:\\workspace"
        chatDiff={[]}
        gitStatus={null}
        configuredPreviewUrls={[]}
        onOpenEnvironment={vi.fn()}
        onOpenFiles={vi.fn()}
        onOpenDiff={vi.fn()}
        onOpenExplorer={vi.fn()}
      />,
    );

    expect(html).toContain('data-workspace-summary-control="true"');
    expect(html).toContain('aria-label="Open workspace summary"');
    expect(html).toContain(">Summary</span>");
    expect(html).toContain(">Summary</span>");
  });

  it("keeps routing, subagent, and verification state in the summary", () => {
    expect(
      resolveEnvironmentQuickSummary({
        chatChangeCount: null,
        workspaceChangeCount: 4,
        providerLabel: "Codex",
        modelLabel: "GPT-5.6 Luna",
        sessionStatus: "running",
      }),
    ).toEqual({
      chatChangeValue: undefined,
      workspaceChangeValue: "4 files",
      currentWorkValue: "Codex · GPT-5.6 Luna",
      sessionValue: "In progress",
    });
  });
});
