import { ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  chatPreviewServerKey,
  chatPreviewServersSignature,
  selectChatPreviewCard,
} from "./chatWebPreviewLogic";
import type { PreviewableServer } from "./useDiscoveredLocalServers";

function server(overrides: Partial<PreviewableServer> & { port: number }): PreviewableServer {
  return {
    host: "localhost",
    url: `http://localhost:${overrides.port}`,
    requestedUrl: `http://localhost:${overrides.port}`,
    processName: "node",
    pid: 1,
    terminal: null,
    source: "scanner",
    ...overrides,
  };
}

describe("chatPreviewServerKey", () => {
  it("keys a server by host and port", () => {
    expect(chatPreviewServerKey(server({ port: 5173 }))).toBe("localhost:5173");
  });
});

describe("chatPreviewServersSignature", () => {
  it("is order-insensitive over the live server set", () => {
    const a = chatPreviewServersSignature([server({ port: 3000 }), server({ port: 5173 })]);
    const b = chatPreviewServersSignature([server({ port: 5173 }), server({ port: 3000 })]);
    expect(a).toBe(b);
  });

  it("changes when a server appears or disappears", () => {
    const before = chatPreviewServersSignature([server({ port: 3000 })]);
    const after = chatPreviewServersSignature([server({ port: 3000 }), server({ port: 5173 })]);
    expect(after).not.toBe(before);
  });
});

describe("selectChatPreviewCard", () => {
  it("returns null when no servers are live", () => {
    expect(selectChatPreviewCard([], { threadId: "thread-1", dismissals: undefined })).toBeNull();
  });

  it("selects the only live server", () => {
    const card = selectChatPreviewCard([server({ port: 5173 })], {
      threadId: "thread-1",
      dismissals: undefined,
    });
    expect(card?.primary.port).toBe(5173);
    expect(card?.others).toEqual([]);
  });

  it("prefers the server attributed to this thread's terminal over list order", () => {
    const attributed = server({
      port: 8080,
      terminal: { threadId: ThreadId.make("thread-1"), terminalId: "term-1" },
    });
    const card = selectChatPreviewCard([server({ port: 3000 }), attributed], {
      threadId: "thread-1",
      dismissals: undefined,
    });
    expect(card?.primary.port).toBe(8080);
    expect(card?.others.map((entry) => entry.port)).toEqual([3000]);
  });

  it("falls back to list order when no server is attributed to the thread", () => {
    const card = selectChatPreviewCard([server({ port: 3000 }), server({ port: 5173 })], {
      threadId: "thread-1",
      dismissals: undefined,
    });
    expect(card?.primary.port).toBe(3000);
  });

  it("hides a server dismissed against the current live set", () => {
    const servers = [server({ port: 3000 }), server({ port: 5173 })];
    const signature = chatPreviewServersSignature(servers);
    const card = selectChatPreviewCard(servers, {
      threadId: "thread-1",
      dismissals: new Map([["localhost:3000", signature]]),
    });
    expect(card?.primary.port).toBe(5173);
    expect(card?.others).toEqual([]);
  });

  it("hides the card entirely when every live server is dismissed", () => {
    const servers = [server({ port: 3000 })];
    const signature = chatPreviewServersSignature(servers);
    const card = selectChatPreviewCard(servers, {
      threadId: "thread-1",
      dismissals: new Map([["localhost:3000", signature]]),
    });
    expect(card).toBeNull();
  });

  it("brings the card back when the live set changed since the dismissal", () => {
    const servers = [server({ port: 3000 })];
    const staleSignature = chatPreviewServersSignature([
      server({ port: 3000 }),
      server({ port: 9999 }),
    ]);
    const card = selectChatPreviewCard(servers, {
      threadId: "thread-1",
      dismissals: new Map([["localhost:3000", staleSignature]]),
    });
    expect(card?.primary.port).toBe(3000);
  });
});
