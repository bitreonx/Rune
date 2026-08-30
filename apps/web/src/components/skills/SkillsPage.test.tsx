import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  BUNDLED_SKILL_MARKETPLACE,
  marketplaceSkillIdentity,
  type SkillMarketplaceView,
} from "../../skills/marketplaceRegistry";
import {
  MarketplaceCompatibilityMarks,
  marketplaceStatusLabel,
  marketplaceStatusVariant,
} from "./MarketplaceSkillMetadata";
import { SkillDetailPanel } from "./SkillDetailPanel";

const marketplaceEntry: SkillMarketplaceView = {
  ...BUNDLED_SKILL_MARKETPLACE[0]!,
  identity: marketplaceSkillIdentity(BUNDLED_SKILL_MARKETPLACE[0]!),
  status: "update",
};

describe("SkillsPage marketplace surfaces", () => {
  it("keeps marketplace status truthful and exposes every compatibility mark", () => {
    expect(marketplaceStatusLabel("available")).toBe("Not installed");
    expect(marketplaceStatusLabel("update")).toBe("Update available");
    expect(marketplaceStatusVariant("update")).toBe("warning");

    const html = renderToStaticMarkup(
      <MarketplaceCompatibilityMarks compatibility={marketplaceEntry.compatibility} />,
    );

    expect(html).toContain("RUNE Native");
    expect(html).toContain("Codex");
    expect(html).toContain("Claude Code");
    expect(html).toContain("OpenCode");
    expect(html).toContain('data-rune-marketplace-compatibility="true"');
  });

  it("keeps the detail panel viewport constrained and exposes the same source metadata", () => {
    const html = renderToStaticMarkup(
      <SkillDetailPanel
        entry={null}
        marketplaceEntry={marketplaceEntry}
        onInstallMarketplace={vi.fn()}
        onUseSkill={vi.fn()}
      />,
    );

    expect(html).toContain("sticky");
    expect(html).toContain("max-h-[calc(100dvh-2.5rem)]");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("https://github.com/mattpocock/skills");
    expect(html).toContain("Update");
  });

});
