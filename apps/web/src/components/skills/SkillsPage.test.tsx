import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("../../state/environments", () => ({
  useEnvironments: vi.fn(() => ({ environments: [], isReady: true })),
  usePrimaryEnvironmentId: vi.fn(() => null),
}));
vi.mock("../../state/projects", () => ({ projectEnvironment: { writeFile: {} } }));
vi.mock("../../state/server", () => ({
  EMPTY_SERVER_PROVIDERS: [],
  serverEnvironment: {
    providersValueAtom: vi.fn(),
    configValueAtom: vi.fn(),
    refreshProviders: {},
  },
}));
vi.mock("../../state/use-atom-command", () => ({ useAtomCommand: vi.fn() }));
vi.mock("@rune/client-runtime/state/runtime", () => ({
  isAtomCommandInterrupted: vi.fn(() => false),
  squashAtomCommandFailure: vi.fn((value) => value),
}));
vi.mock("@rune/client-runtime/providerSkills", () => ({
  formatProviderSkillDisplayName: vi.fn((skill: { name: string }) => skill.name),
  getProviderSkillIdentity: vi.fn((skill: { name: string }) => skill.name),
  resolveProviderSkillSourceKind: vi.fn(() => "other"),
}));

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
import {
  focusSkillElement,
  MarketplaceListRow,
  marketplaceCatalogSourceLabel,
  nextSkillViewForKey,
  resolveSkillSelectionKey,
  SkillCatalogLoadingState,
  SkillViewTabs,
  SKILL_VIEWS,
} from "./SkillsPage";
import { SkillDetailPanel } from "./SkillDetailPanel";

const marketplaceEntry: SkillMarketplaceView = {
  ...BUNDLED_SKILL_MARKETPLACE[0]!,
  identity: marketplaceSkillIdentity(BUNDLED_SKILL_MARKETPLACE[0]!),
  installedVersion: 1,
  status: "update",
};

describe("SkillsPage marketplace surfaces", () => {
  it("labels the live catalog state without hiding the bundled fallback", () => {
    expect(marketplaceCatalogSourceLabel("loading")).toBe(
      "Loading GitHub marketplace · bundled preview",
    );
    expect(marketplaceCatalogSourceLabel("github")).toBe("GitHub catalog · live source");
    expect(marketplaceCatalogSourceLabel("bundled")).toBe("GitHub unavailable · bundled fallback");
  });

  it("keeps tab navigation and selection fallback deterministic", () => {
    expect(nextSkillViewForKey("installed", "ArrowRight")).toBe("discover");
    expect(nextSkillViewForKey("installed", "ArrowLeft")).toBe("updates");
    expect(nextSkillViewForKey("discover", "Home")).toBe("installed");
    expect(nextSkillViewForKey("discover", "End")).toBe("updates");
    expect(nextSkillViewForKey("discover", "Enter")).toBeNull();

    expect(resolveSkillSelectionKey(["first", "second"], "second")).toBe("second");
    expect(resolveSkillSelectionKey(["first", "second"], "missing")).toBe("first");
    expect(resolveSkillSelectionKey([], "missing")).toBeNull();

    const focus = vi.fn();
    focusSkillElement({ focus });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("defines the Installed, Discover, and Updates tab contract", () => {
    expect(SKILL_VIEWS).toEqual([
      { value: "installed", label: "Installed" },
      { value: "discover", label: "Discover" },
      { value: "updates", label: "Updates" },
    ]);

    const html = renderToStaticMarkup(
      <SkillViewTabs
        view="discover"
        counts={{ installed: 4, discover: 2, updates: 1 }}
        onSelect={vi.fn()}
        onKeyDown={vi.fn()}
      />,
    );

    expect(html).toContain('data-rune-skill-tabs="true"');
    expect(html).toContain('id="skills-view-installed-tab"');
    expect(html).toContain('id="skills-view-discover-tab"');
    expect(html).toContain('id="skills-view-updates-tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-controls="skills-view-discover-panel"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('tabindex="-1"');
  });

  it("marks the loading indicator as reduced-motion aware", () => {
    const html = renderToStaticMarkup(<SkillCatalogLoadingState />);

    expect(html).toContain('data-rune-skill-loading="true"');
    expect(html).toContain('data-rune-skill-loading-motion="reduced-motion-aware"');
    expect(html).toContain("motion-safe:animate-spin");
    expect(html).toContain("motion-reduce:animate-none");
    expect(html).not.toContain("animate-pulse");
  });

  it("keeps marketplace status truthful and exposes every compatibility mark", () => {
    expect(marketplaceStatusLabel("available")).toBe("Not installed");
    expect(marketplaceStatusLabel("update")).toBe("Update available");
    expect(marketplaceStatusLabel("installed")).toBe("Installed");
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

  it("renders source, author, version, scope, state, and all compatibility marks on a row", () => {
    const html = renderToStaticMarkup(
      <MarketplaceListRow entry={marketplaceEntry} selected onSelect={vi.fn()} />,
    );

    expect(html).toContain(
      'data-rune-marketplace-row="repository:https://github.com/mattpocock/skills#grill-me"',
    );
    expect(html).toContain('data-rune-marketplace-selected="true"');
    expect(html).toContain('data-rune-marketplace-status="update"');
    expect(html).toContain("GitHub source:");
    expect(html).toContain("Author:");
    expect(html).toContain("mattpocock");
    expect(html).toContain("Version:");
    expect(html).toContain("v1");
    expect(html).toContain("Project · .agents/skills");
    expect(html).toContain("RUNE Native");
    expect(html).toContain("Codex");
    expect(html).toContain("Claude Code");
    expect(html).toContain("OpenCode");
    expect(html).not.toMatch(/popular|downloads|installs/iu);
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
    expect(html).toContain('data-rune-skill-marketplace-detail="true"');
    expect(html).toContain('data-rune-skill-detail-layout="sticky"');
    expect(html).toContain('data-rune-skill-detail-scroll="viewport"');
    expect(html).toContain("https://github.com/mattpocock/skills");
    expect(html).toContain("mattpocock");
    expect(html).toContain("Catalog version");
    expect(html).toContain('data-rune-marketplace-catalog-version="true"');
    expect(html).toContain('data-rune-marketplace-installed-version="true"');
    expect(html).toContain("Project · .agents/skills");
    expect(html).toContain("Update available");
    expect(html).toContain("Install update");
  });
});
