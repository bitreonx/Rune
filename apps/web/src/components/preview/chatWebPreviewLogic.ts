import type { PreviewableServer } from "./useDiscoveredLocalServers";
import type { ChatWebPreviewIntent } from "./chatWebPreviewIntent";

export interface ChatPreviewCard {
  readonly primary: PreviewableServer;
  readonly others: ReadonlyArray<PreviewableServer>;
}

export function chatPreviewServerKey(server: Pick<PreviewableServer, "host" | "port">): string {
  return `${server.host}:${server.port}`;
}

/**
 * Signature of the live server set. A dismissal recorded against one signature
 * stops applying once the set changes, so a newly started server always gets a
 * fresh card.
 */
export function chatPreviewServersSignature(
  servers: ReadonlyArray<Pick<PreviewableServer, "host" | "port">>,
): string {
  return servers
    .map(chatPreviewServerKey)
    .toSorted()
    .join("\n");
}

export function selectChatPreviewCard(
  servers: ReadonlyArray<PreviewableServer>,
  options: {
    readonly threadId: string;
    readonly dismissals: ReadonlyMap<string, string> | undefined;
    readonly intent: ChatWebPreviewIntent;
  },
): ChatPreviewCard | null {
  if (options.intent === "none") return null;
  const signature = chatPreviewServersSignature(servers);
  const visible = servers.filter(
    (server) => options.dismissals?.get(chatPreviewServerKey(server)) !== signature,
  );
  const attributed = visible.find((server) => server.terminal?.threadId === options.threadId);
  const primary =
    options.intent === "requested-dev-server"
      ? (visible.find((server) => server.source === "configured") ?? attributed)
      : (attributed ?? visible[0]);
  if (!primary) return null;
  return {
    primary,
    others: visible.filter((server) => server !== primary),
  };
}
