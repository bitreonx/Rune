import { EnvironmentId, ThreadId } from "@rune/contracts";
import { scopedThreadKey } from "@rune/client-runtime/environment";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

import type { OpenPreviewMutation } from "~/browser/openFileInPreview";

const mocks = vi.hoisted(() => ({
  servers: [] as Array<{
    host: string;
    port: number;
    url: string;
    requestedUrl: string;
    processName: string | null;
    pid: number | null;
    terminal: null | { threadId: ThreadId; terminalId: string };
    source: "scanner";
  }>,
  previewSupported: true,
  dismissalsByThread: new Map<string, ReadonlyMap<string, string>>(),
}));

vi.mock("./useDiscoveredLocalServers", () => ({
  useDiscoveredLocalServers: () => mocks.servers,
}));
vi.mock("./PreviewFaviconIcon", () => ({
  PreviewFaviconIcon: () => <span data-favicon-icon />,
}));
vi.mock("~/previewStateStore", () => ({
  isPreviewSupportedInRuntime: () => mocks.previewSupported,
}));
vi.mock("./chatWebPreviewDismissals", () => {
  const useChatWebPreviewDismissalStore = Object.assign(
    (select: (state: unknown) => unknown) =>
      select({
        byThread: mocks.dismissalsByThread,
        dismiss: () => undefined,
      }),
    {
      getState: () => ({
        byThread: mocks.dismissalsByThread,
        dismiss: () => undefined,
      }),
    },
  );
  return { useChatWebPreviewDismissalStore };
});

import { chatPreviewServersSignature } from "./chatWebPreviewLogic";
import { ChatWebPreviewCard } from "./ChatWebPreviewCard";

const environmentId = EnvironmentId.make("env-1");
const threadRef = { environmentId, threadId: ThreadId.make("thread-1") };
const threadKey = scopedThreadKey(threadRef);
const openPreview = (() => Promise.resolve(null)) as unknown as OpenPreviewMutation<never>;

function server(port: number) {
  return {
    host: "localhost",
    port,
    url: `http://localhost:${port}`,
    requestedUrl: `http://localhost:${port}`,
    processName: "node",
    pid: 1,
    terminal: null,
    source: "scanner" as const,
  };
}

function renderCard() {
  return renderToStaticMarkup(
    <ChatWebPreviewCard
      threadRef={threadRef}
      environmentId={environmentId}
      messages={[{ role: "user", text: "show me the web preview" }]}
      configuredUrls={[]}
      openPreview={openPreview}
    />,
  );
}

function seedDismissal(serverKey: string, signature: string) {
  mocks.dismissalsByThread = new Map([
    [threadKey, new Map([[serverKey, signature]])],
  ]);
}

describe("ChatWebPreviewCard", () => {
  it("renders nothing when no dev server is live", () => {
    mocks.servers = [];
    expect(renderCard()).toBe("");
  });

  it("renders a web preview card for a live dev server", () => {
    mocks.servers = [server(5173)];
    const html = renderCard();
    expect(html).toContain("Web preview");
    expect(html).toContain("localhost:5173");
    expect(html).toContain("data-favicon-icon");
    expect(html).toContain("Open in");
    expect(html).toContain("Dismiss web preview");
  });

  it("renders nothing when the live server was dismissed against the current set", () => {
    mocks.servers = [server(5173)];
    seedDismissal("localhost:5173", chatPreviewServersSignature(mocks.servers));
    expect(renderCard()).toBe("");
  });

  it("renders again when the live set changed since the dismissal", () => {
    mocks.servers = [server(5173)];
    seedDismissal("localhost:5173", "stale-signature");
    expect(renderCard()).toContain("localhost:5173");
  });

  it("shows the thread-attributed server when several are live", () => {
    mocks.servers = [
      server(3000),
      { ...server(8080), terminal: { threadId: threadRef.threadId, terminalId: "term-1" } },
    ];
    const html = renderCard();
    expect(html).toContain("localhost:8080");
    expect(html).not.toContain("localhost:3000");
  });
});
