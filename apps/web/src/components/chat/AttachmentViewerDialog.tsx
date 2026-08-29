import {
  AudioLinesIcon,
  ClipboardIcon,
  ExternalLinkIcon,
  FileIcon,
  FileTextIcon,
  FolderOpenIcon,
  ImageIcon,
  LoaderCircle,
  VideoIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { EnvironmentId } from "@rune/contracts";

import { useAssetUrlState } from "../../assets/assetUrls";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { formatBytes } from "../files/viewers/formatBytes";

const MAX_LOCAL_HASH_BYTES = 32 * 1024 * 1024;

export type AttachmentViewerItem = {
  readonly type: "file";
  readonly kind: "file" | "folder";
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly path?: string;
  readonly file?: File;
};

function attachmentSizeBytes(attachment: AttachmentViewerItem): number {
  return attachment.file?.size ?? attachment.sizeBytes;
}

function localFileModifiedAt(file: File | undefined): string | undefined {
  if (!file || !Number.isFinite(file.lastModified)) return undefined;
  const modifiedAt = new Date(file.lastModified);
  return Number.isNaN(modifiedAt.getTime()) ? undefined : modifiedAt.toISOString();
}

async function computeLocalFileSha256(file: File): Promise<string | undefined> {
  if (file.size > MAX_LOCAL_HASH_BYTES || !globalThis.crypto?.subtle) return undefined;
  try {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  } catch {
    return undefined;
  }
}

function normalizedMimeType(attachment: AttachmentViewerItem): string {
  return attachment.mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

export function attachmentViewerTypeLabel(attachment: AttachmentViewerItem): string {
  if (attachment.kind === "folder") return "Folder";
  const mimeType = normalizedMimeType(attachment);
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "application/octet-stream") return "Binary";
  return "File";
}

function AttachmentTypeIcon({ attachment }: { readonly attachment: AttachmentViewerItem }) {
  if (attachment.kind === "folder") return <FolderOpenIcon aria-hidden="true" />;
  const mimeType = normalizedMimeType(attachment);
  if (mimeType.startsWith("image/")) return <ImageIcon aria-hidden="true" />;
  if (mimeType.startsWith("video/")) return <VideoIcon aria-hidden="true" />;
  if (mimeType.startsWith("audio/")) return <AudioLinesIcon aria-hidden="true" />;
  if (mimeType === "application/pdf") return <FileTextIcon aria-hidden="true" />;
  return <FileIcon aria-hidden="true" />;
}

function AttachmentMetadata({
  attachment,
  description,
  sha256,
}: {
  readonly attachment: AttachmentViewerItem;
  readonly description?: string;
  readonly sha256?: string;
}) {
  const mimeType = normalizedMimeType(attachment);
  const modifiedAt = localFileModifiedAt(attachment.file);
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-xl border border-border/70 bg-muted/25 px-6 py-10 text-center"
      data-attachment-viewer-metadata="true"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-background text-muted-foreground [&>svg]:size-7">
        <AttachmentTypeIcon attachment={attachment} />
      </span>
      <div className="space-y-1">
        <dl
          className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-left text-xs"
          data-attachment-viewer-metadata-details="true"
        >
          <dt className="text-muted-foreground">Name</dt>
          <dd className="min-w-0 break-all font-medium text-foreground">{attachment.name}</dd>
          <dt className="text-muted-foreground">Type</dt>
          <dd className="min-w-0 break-all text-foreground">
            {attachmentViewerTypeLabel(attachment)} · {mimeType || "Unknown type"}
          </dd>
          <dt className="text-muted-foreground">Size</dt>
          <dd className="text-foreground">{formatBytes(attachmentSizeBytes(attachment))}</dd>
          {modifiedAt ? (
            <>
              <dt className="text-muted-foreground">Modified</dt>
              <dd className="break-all text-foreground">
                <time dateTime={modifiedAt}>{modifiedAt}</time>
              </dd>
            </>
          ) : null}
          {sha256 ? (
            <>
              <dt className="text-muted-foreground">SHA-256</dt>
              <dd className="break-all font-mono text-foreground">{sha256}</dd>
            </>
          ) : null}
        </dl>
        <p className="text-xs text-muted-foreground">
          {description ?? "RUNE keeps this reference safe and does not execute it."}
        </p>
      </div>
    </div>
  );
}

function AttachmentMediaPreview({
  attachment,
  sourceUrl,
  sha256,
}: {
  readonly attachment: AttachmentViewerItem;
  readonly sourceUrl: string;
  readonly sha256?: string;
}) {
  const mimeType = normalizedMimeType(attachment);
  if (mimeType.startsWith("image/")) {
    return (
      <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl bg-muted/20 p-3">
        <img
          src={sourceUrl}
          alt={attachment.name}
          className="max-h-[min(60vh,42rem)] max-w-full rounded-lg object-contain"
        />
      </div>
    );
  }
  if (mimeType.startsWith("video/")) {
    return (
      <div className="overflow-hidden rounded-xl bg-black">
        <video
          src={sourceUrl}
          controls
          preload="metadata"
          className="max-h-[min(60vh,42rem)] w-full"
        />
      </div>
    );
  }
  if (mimeType.startsWith("audio/")) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-xl border border-border/70 bg-muted/25 p-6">
        <audio src={sourceUrl} controls className="w-full" preload="metadata" />
      </div>
    );
  }
  if (mimeType === "application/pdf") {
    return (
      <div className="h-[min(64vh,42rem)] overflow-hidden rounded-xl border border-border/70 bg-muted/20">
        <iframe title={attachment.name} src={sourceUrl} className="h-full w-full" />
      </div>
    );
  }
  return (
    <AttachmentMetadata
      attachment={attachment}
      sha256={sha256}
      description="This file type is not rendered inline. Use the safe reveal actions below."
    />
  );
}

function LocalAttachmentContent({ attachment }: { readonly attachment: AttachmentViewerItem }) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sha256, setSha256] = useState<string | undefined>();

  useEffect(() => {
    if (!attachment.file || typeof URL === "undefined") {
      setSourceUrl(null);
      setSha256(undefined);
      return;
    }
    let active = true;
    const nextUrl = URL.createObjectURL(attachment.file);
    setSourceUrl(nextUrl);
    setSha256(undefined);
    void computeLocalFileSha256(attachment.file).then((digest) => {
      if (active) setSha256(digest);
    });
    return () => {
      active = false;
      URL.revokeObjectURL(nextUrl);
    };
  }, [attachment.file]);

  if (sourceUrl === null) {
    return (
      <AttachmentMetadata
        attachment={attachment}
        sha256={sha256}
        description="Preparing local preview…"
      />
    );
  }
  return <AttachmentMediaPreview attachment={attachment} sourceUrl={sourceUrl} sha256={sha256} />;
}

function ServerAttachmentContent({
  environmentId,
  attachment,
}: {
  readonly environmentId: EnvironmentId;
  readonly attachment: AttachmentViewerItem;
}) {
  const assetUrl = useAssetUrlState(environmentId, {
    _tag: "attachment",
    attachmentId: attachment.id,
  });

  if (assetUrl._tag === "Loading") {
    return (
      <div className="flex min-h-48 items-center justify-center text-muted-foreground">
        <LoaderCircle
          className="size-5 animate-spin motion-reduce:animate-none"
          aria-label="Loading attachment"
        />
      </div>
    );
  }
  if (assetUrl._tag === "Failure") {
    return (
      <AttachmentMetadata
        attachment={attachment}
        description={assetUrl.message ?? "The server could not provide a preview for this reference."}
      />
    );
  }
  return <AttachmentMediaPreview attachment={attachment} sourceUrl={assetUrl.url} />;
}

export function AttachmentViewerDialog(props: {
  readonly open: boolean;
  readonly attachment: AttachmentViewerItem | null;
  readonly environmentId: EnvironmentId;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRevealInFiles?: (attachment: AttachmentViewerItem) => void;
  readonly onRevealInExplorer?: (attachment: AttachmentViewerItem) => void;
  readonly onCopyPath?: (attachment: AttachmentViewerItem) => void;
}) {
  const { attachment } = props;
  const hasPath = attachment?.path !== undefined && attachment.path.length > 0;
  return (
    <Dialog open={props.open && attachment !== null} onOpenChange={props.onOpenChange}>
      {attachment ? (
        <DialogPopup
          className="w-[min(90vw,56rem)] max-w-none"
          bottomStickOnMobile={false}
          data-attachment-viewer-dialog="true"
        >
          <DialogHeader className="border-b border-border/60 pr-14">
            <DialogTitle className="flex min-w-0 items-center gap-2 text-base">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&>svg]:size-4">
                <AttachmentTypeIcon attachment={attachment} />
              </span>
              <span className="truncate">{attachment.name}</span>
            </DialogTitle>
            <DialogDescription>
              {attachmentViewerTypeLabel(attachment)} · {formatBytes(attachmentSizeBytes(attachment))}
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-4">
            {attachment.kind === "folder" ? (
              <AttachmentMetadata
                attachment={attachment}
                description="Folders are referenced by path for the selected agent environment."
              />
            ) : attachment.file ? (
              <LocalAttachmentContent attachment={attachment} />
            ) : attachment.path ? (
              <AttachmentMetadata
                attachment={attachment}
                description="Preview unavailable for this agent-environment path; the renderer cannot access provider-host files."
              />
            ) : (
              <ServerAttachmentContent environmentId={props.environmentId} attachment={attachment} />
            )}
          </DialogPanel>
          {hasPath ? (
            <DialogFooter variant="bare" className="border-t border-border/60 sm:justify-between">
              <p className="min-w-0 truncate text-xs text-muted-foreground">
                Safe actions keep the file outside the prompt text.
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                {props.onRevealInFiles ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => props.onRevealInFiles?.(attachment)}
                  >
                    <FolderOpenIcon aria-hidden="true" /> Reveal in RUNE Files
                  </Button>
                ) : null}
                {props.onRevealInExplorer ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => props.onRevealInExplorer?.(attachment)}
                  >
                    <ExternalLinkIcon aria-hidden="true" /> Reveal in system Explorer
                  </Button>
                ) : null}
                {props.onCopyPath ? (
                  <Button
                    type="button"
                    variant="ghost-muted"
                    size="sm"
                    onClick={() => props.onCopyPath?.(attachment)}
                  >
                    <ClipboardIcon aria-hidden="true" /> Copy path
                  </Button>
                ) : null}
              </div>
            </DialogFooter>
          ) : null}
        </DialogPopup>
      ) : null}
    </Dialog>
  );
}
