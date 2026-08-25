import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mediaQueryState = vi.hoisted(() => ({ reducedMotion: false }));
const routerState = vi.hoisted(() => ({
  location: { hash: "", pathname: "/settings/providers" },
  navigate: vi.fn(),
}));

vi.mock("../hooks/useMediaQuery", () => ({
  useMediaQuery: () => mediaQueryState.reducedMotion,
}));

vi.mock("@tanstack/react-router", () => ({
  useLocation: <T,>({ select }: { select: (location: typeof routerState.location) => T }) =>
    select(routerState.location),
  useNavigate: () => routerState.navigate,
}));

import { WorkspaceRouteContent } from "./AppSidebarLayout";
import { RunePageTransition } from "./RunePageTransition";
import { SettingsPageContainer } from "./settings/settingsLayout";

class TestNode {
  parentNode: TestNode | null = null;
  childNodes: TestNode[] = [];
  readonly attributes = new Map<string, string>();
  readonly namespaceURI = "http://www.w3.org/1999/xhtml";
  readonly nodeName: string;
  readonly tagName: string;
  readonly style = {};
  private textValue = "";

  constructor(
    name: string,
    readonly ownerDocument: TestNode | null = null,
    readonly nodeType = 1,
  ) {
    this.nodeName = name.toUpperCase();
    this.tagName = this.nodeName;
  }

  get textContent() {
    return `${this.textValue}${this.childNodes.map((child) => child.textContent).join("")}`;
  }

  set textContent(value: string) {
    this.textValue = value;
    this.childNodes = [];
  }

  appendChild(child: TestNode) {
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  insertBefore(child: TestNode, before: TestNode | null) {
    if (!before) return this.appendChild(child);
    child.parentNode = this;
    this.childNodes.splice(this.childNodes.indexOf(before), 0, child);
    return child;
  }

  removeChild(child: TestNode) {
    this.childNodes.splice(this.childNodes.indexOf(child), 1);
    child.parentNode = null;
    return child;
  }

  createElement(name: string) {
    return new TestNode(name, this);
  }

  createTextNode(value: string) {
    const node = new TestNode("#text", this, 3);
    node.textContent = value;
    return node;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener() {}
  removeEventListener() {}
}

function findAllByAttribute(node: TestNode, name: string): TestNode[] {
  return [
    ...(node.attributes.has(name) ? [node] : []),
    ...node.childNodes.flatMap((child) => findAllByAttribute(child, name)),
  ];
}

function installTestDom() {
  const document = new TestNode("#document", null, 9);
  const window = {
    HTMLIFrameElement: TestNode,
    document,
    addEventListener() {},
    removeEventListener() {},
  };
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", window);
  vi.stubGlobal("HTMLIFrameElement", window.HTMLIFrameElement);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  return document;
}

function currentTransition(container: TestNode) {
  const [transition] = findAllByAttribute(container, "data-rune-page-transition");
  if (!transition) throw new Error("Expected one page transition boundary");
  return transition;
}

function currentPageIds(container: TestNode) {
  return findAllByAttribute(container, "data-page").map((page) => page.getAttribute("data-page"));
}

describe("RunePageTransition", () => {
  let nextFrameId: number;
  let frames: Map<number, FrameRequestCallback>;
  let cancelAnimationFrame: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mediaQueryState.reducedMotion = false;
    routerState.location = { hash: "", pathname: "/settings/providers" };
    routerState.navigate.mockClear();
    nextFrameId = 1;
    frames = new Map();
    cancelAnimationFrame = vi.fn((frame: number) => {
      frames.delete(frame);
    });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      const frame = nextFrameId++;
      frames.set(frame, callback);
      return frame;
    });
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a stable route key and reduced-motion class", () => {
    const markup = renderToStaticMarkup(
      <RunePageTransition routeKey="settings/providers">
        <div>Providers</div>
      </RunePageTransition>,
    );

    expect(markup).toContain('data-rune-page-transition="settings/providers"');
    expect(markup).toContain('data-rune-page-transition-state="entering"');
    expect(markup).toContain("motion-reduce:transition-none");
  });

  it("renders the settled state immediately when reduced motion is active", () => {
    mediaQueryState.reducedMotion = true;

    const markup = renderToStaticMarkup(
      <RunePageTransition routeKey="settings/providers">
        <div>Providers</div>
      </RunePageTransition>,
    );

    expect(markup).toContain('data-rune-page-transition-state="entered"');
  });

  it("replaces route A with route B while mounting only the current page tree", async () => {
    const document = installTestDom();
    const container = document.createElement("div");
    const root = createRoot(container as unknown as Element);

    try {
      await act(async () => {
        root.render(
          <RunePageTransition routeKey="route-a">
            <main data-page="route-a" />
          </RunePageTransition>,
        );
      });
      const routeAFrame = 1;
      expect(currentTransition(container).getAttribute("data-rune-page-transition")).toBe("route-a");
      expect(currentPageIds(container)).toEqual(["route-a"]);

      await act(async () => {
        root.render(
          <RunePageTransition routeKey="route-b">
            <main data-page="route-b" />
          </RunePageTransition>,
        );
      });

      expect(cancelAnimationFrame).toHaveBeenCalledWith(routeAFrame);
      expect(currentTransition(container).getAttribute("data-rune-page-transition")).toBe("route-b");
      expect(currentTransition(container).getAttribute("data-rune-page-transition-state")).toBe("entering");
      expect(currentPageIds(container)).toEqual(["route-b"]);
      expect(findAllByAttribute(container, "data-rune-page-transition")).toHaveLength(1);
    } finally {
      await unmount(root);
    }
  });

  it("settles immediately for reduced motion and restarts when motion is restored", async () => {
    const document = installTestDom();
    const container = document.createElement("div");
    const root = createRoot(container as unknown as Element);

    try {
      await renderTransition(root, "route-a");
      expect(currentTransition(container).getAttribute("data-rune-page-transition-state")).toBe("entering");

      mediaQueryState.reducedMotion = true;
      await renderTransition(root, "route-a");
      expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
      expect(currentTransition(container).getAttribute("data-rune-page-transition-state")).toBe("entered");
      expect(frames).toHaveLength(0);

      mediaQueryState.reducedMotion = false;
      await renderTransition(root, "route-a");
      expect(currentTransition(container).getAttribute("data-rune-page-transition-state")).toBe("entering");
      expect(frames).toHaveLength(1);

      await flushFrame(frames);
      expect(currentTransition(container).getAttribute("data-rune-page-transition-state")).toBe("entered");
    } finally {
      await unmount(root);
    }
  });

  it("keeps the settings page transition settled when only the hash changes", async () => {
    const document = installTestDom();
    const container = document.createElement("div");
    const root = createRoot(container as unknown as Element);

    try {
      await act(async () => {
        root.render(
          <SettingsPageContainer>
            <main data-page="providers" />
          </SettingsPageContainer>,
        );
      });
      await flushFrame(frames);
      expect(currentTransition(container).getAttribute("data-rune-page-transition-state")).toBe("entered");

      routerState.location = { hash: "#provider-key", pathname: "/settings/providers" };
      await act(async () => {
        root.render(
          <SettingsPageContainer>
            <main data-page="providers" />
          </SettingsPageContainer>,
        );
      });

      expect(currentTransition(container).getAttribute("data-rune-page-transition")).toBe(
        "/settings/providers",
      );
      expect(currentTransition(container).getAttribute("data-rune-page-transition-state")).toBe("entered");
      expect(frames).toHaveLength(0);
      expect(currentPageIds(container)).toEqual(["providers"]);
    } finally {
      await unmount(root);
    }
  });

  it("wraps non-settings workspace content once and leaves settings to their inner boundary", () => {
    const workspaceMarkup = renderToStaticMarkup(
      <WorkspaceRouteContent pathname="/usage">
        <main data-page="usage" />
      </WorkspaceRouteContent>,
    );
    const settingsMarkup = renderToStaticMarkup(
      <WorkspaceRouteContent pathname="/settings/providers">
        <main data-page="providers" />
      </WorkspaceRouteContent>,
    );

    expect(workspaceMarkup).toContain('data-rune-page-transition="/usage"');
    expect(workspaceMarkup.match(/data-rune-page-transition=/g)).toHaveLength(1);
    expect(settingsMarkup).not.toContain("data-rune-page-transition");
  });
});

async function renderTransition(root: Root, routeKey: string) {
  await act(async () => {
    root.render(
      <RunePageTransition routeKey={routeKey}>
        <main data-page={routeKey} />
      </RunePageTransition>,
    );
  });
}

async function flushFrame(frames: Map<number, FrameRequestCallback>) {
  const [frame, callback] = [...frames.entries()][0] ?? [];
  if (frame === undefined || !callback) throw new Error("Expected a pending animation frame");
  frames.delete(frame);
  await act(async () => callback(0));
}

async function unmount(root: Root) {
  await act(async () => root.unmount());
}
