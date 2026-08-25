import type { ServerProviderSkill } from "@t3tools/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

import { ComposerContextTray } from "./ComposerContextTray";

const skill = {
  name: "review-ui",
  displayName: "Review UI",
  description: "Review the current interface",
  path: "/project/.agents/skills/review-ui/SKILL.md",
  scope: "project",
  enabled: true,
} satisfies ServerProviderSkill;

describe("ComposerContextTray", () => {
  it("renders context chips and provider skills together", () => {
    const html = renderToStaticMarkup(
      <ComposerContextTray
        contexts={[{ id: "terminal-1", kind: "terminal", label: "Console", scope: "lines 4-8" }]}
        skills={[skill]}
        onRemoveContext={vi.fn()}
        onOpenSkill={vi.fn()}
      />,
    );
    expect(html).toContain('data-composer-context-tray="true"');
    expect(html).toContain("Console");
    expect(html).toContain("lines 4-8");
    expect(html).toContain("$Review UI");
    expect(html).toContain('data-composer-skill-tray="true"');
  });

  it("does not add empty chrome", () => {
    expect(
      renderToStaticMarkup(
        <ComposerContextTray
          contexts={[]}
          skills={[]}
          onRemoveContext={vi.fn()}
          onOpenSkill={vi.fn()}
        />,
      ),
    ).toBe("");
  });
});

