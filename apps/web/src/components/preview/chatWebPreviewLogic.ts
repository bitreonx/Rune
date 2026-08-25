import type { PreviewableServer } from "./useDiscoveredLocalServers";

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
  },
): ChatPreviewCard | null {
  const signature = chatPreviewServersSignature(servers);
  const visible = servers.filter(
    (server) => options.dismissals?.get(chatPreviewServerKey(server)) !== signature,
  );
  const primary =
    visible.find((server) => server.terminal?.threadId === options.threadId) ?? visible[0];
  if (!primary) return null;
  return {
    primary,
    others: visible.filter((server) => server !== primary),
  };
}
