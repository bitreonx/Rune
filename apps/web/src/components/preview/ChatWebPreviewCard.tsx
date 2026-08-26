"use client";

import type { EnvironmentId, ScopedThreadRef } from "@rune/contracts";
import { scopedThreadKey } from "@rune/client-runtime/environment";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@rune/client-runtime/state/runtime";
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  GlobeIcon,
  LinkIcon,
  PanelRightIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useMemo } from "react";

import { resolveDiscoveredServerUrl } from "~/browser/browserTargetResolver";
import type { OpenPreviewMutation } from "~/browser/openFileInPreview";
import { readLocalApi } from "~/localApi";
import { isPreviewSupportedInRuntime } from "~/previewStateStore";
import { Button } from "~/components/ui/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "~/components/ui/menu";
import { stackedThreadToast, toastManager } from "~/components/ui/toast";

import {
  chatPreviewServerKey,
  chatPreviewServersSignature,
  selectChatPreviewCard,
} from "./chatWebPreviewLogic";
import {
  classifyChatWebPreviewIntent,
  type ChatWebPreviewIntentMessage,
} from "./chatWebPreviewIntent";
import { useChatWebPreviewDismissalStore } from "./chatWebPreviewDismissals";
import { openDiscoveredPort } from "./openDiscoveredPort";
import { PreviewFaviconIcon } from "./PreviewFaviconIcon";
import { useDiscoveredLocalServers, type PreviewableServer } from "./useDiscoveredLocalServers";

interface Props {
  threadRef: ScopedThreadRef;
  environmentId: EnvironmentId;
  messages: ReadonlyArray<ChatWebPreviewIntentMessage>;
  configuredUrls?: ReadonlyArray<string> | undefined;
  openPreview: OpenPreviewMutation<unknown>;
}

/**
 * Chat-docked "Web preview" card. Appears while a browser-ready localhost
 * server is live in the thread's environment; the in-app preview panel is only
 * offered in the desktop runtime, where the browser bridge exists.
 */
export function ChatWebPreviewCard({
  threadRef,
  environmentId,
  messages,
  configuredUrls,
  openPreview,
}: Props) {
  const servers = useDiscoveredLocalServers({ environmentId, configuredUrls });
  const threadKey = scopedThreadKey(threadRef);
  const dismissals = useChatWebPreviewDismissalStore((state) => state.byThread.get(threadKey));
  const dismiss = useChatWebPreviewDismissalStore((state) => state.dismiss);
  const previewSupported = isPreviewSupportedInRuntime();
  const intent = useMemo(() => classifyChatWebPreviewIntent(messages), [messages]);

  const card = useMemo(
    () =>
      selectChatPreviewCard(servers, {
        threadId: threadRef.threadId,
        dismissals,
        intent,
      }),
    [dismissals, intent, servers, threadRef.threadId],
  );

  const openInPreview = useCallback(
    (server: PreviewableServer) => {
      void (async () => {
        const result = await openDiscoveredPort({ threadRef, port: server, openPreview });
        if (result._tag === "Success" || isAtomCommandInterrupted(result)) {
          return;
        }
        const error = squashAtomCommandFailure(result);
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: "Unable to open preview",
            description:
              error instanceof Error ? error.message : "The preview could not be opened.",
          }),
        );
      })();
    },
    [openPreview, threadRef],
  );

  const openInBrowser = useCallback(
    (server: PreviewableServer) => {
      const url = resolveDiscoveredServerUrl(environmentId, server.url);
      const api = readLocalApi();
      if (api) {
        void api.shell.openExternal(url).catch(() => {
          toastManager.add(
            stackedThreadToast({
              type: "error",
              title: "Unable to open link",
              description: "The link could not be opened in a browser.",
            }),
          );
        });
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [environmentId],
  );

  const copyLink = useCallback(
    (server: PreviewableServer) => {
      const url = resolveDiscoveredServerUrl(environmentId, server.url);
      void navigator.clipboard?.writeText(url);
      toastManager.add(stackedThreadToast({ type: "success", title: "Link copied" }));
    },
    [environmentId],
  );

  if (!card) return null;
  const { primary, others } = card;
  const openPrimary = () => (previewSupported ? openInPreview(primary) : openInBrowser(primary));
  const openOther = (server: PreviewableServer) =>
    previewSupported ? openInPreview(server) : openInBrowser(server);
  const cardTitle =
    intent === "requested-link"
      ? "Web link ready"
      : intent === "requested-dev-server"
        ? "Dev server ready"
        : "Web preview ready";
  const primaryActionLabel = previewSupported ? "Open preview" : "Open in browser";

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-center gap-2 border border-border/70 bg-background/95 pe-1.5 ps-2.5 shadow-xs">
        <button
          type="button"
          onClick={openPrimary}
          aria-label={primaryActionLabel}
          className="group flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PreviewFaviconIcon threadRef={threadRef} url={primary.requestedUrl} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{cardTitle}</span>
            <span className="truncate text-xs text-muted-foreground">
              {primary.host}:{primary.port}
            </span>
          </span>
        </button>
        <Menu>
          <MenuTrigger
            render={
              <Button variant="secondary" size="xs">
                Open in
                <ChevronDownIcon className="opacity-70" />
              </Button>
            }
          />
          <MenuPopup align="end">
            {previewSupported ? (
              <MenuItem onClick={() => openInPreview(primary)}>
                <PanelRightIcon />
                Preview panel
              </MenuItem>
            ) : null}
            <MenuItem onClick={() => openInBrowser(primary)}>
              <ExternalLinkIcon />
              Open in browser
            </MenuItem>
            <MenuItem onClick={() => copyLink(primary)}>
              <LinkIcon />
              Copy link
            </MenuItem>
            {others.length > 0 ? (
              <MenuGroup>
                <MenuSeparator />
                <MenuGroupLabel>Other live servers</MenuGroupLabel>
                {others.map((server) => (
                  <MenuItem
                    key={chatPreviewServerKey(server)}
                    onClick={() => openOther(server)}
                  >
                    <GlobeIcon />
                    {server.host}:{server.port}
                  </MenuItem>
                ))}
              </MenuGroup>
            ) : null}
          </MenuPopup>
        </Menu>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Dismiss web preview"
          onClick={() =>
            dismiss(threadKey, chatPreviewServerKey(primary), chatPreviewServersSignature(servers))
          }
        >
          <XIcon />
        </Button>
      </div>
    </div>
  );
}
