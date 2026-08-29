import {
  AudioLinesIcon,
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
}: {
  readonly attachment: AttachmentViewerItem;
  readonly description?: string;
}) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-xl border border-border/70 bg-muted/25 px-6 py-10 text-center"
      data-attachment-viewer-metadata="true"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-background text-muted-foreground [&>svg]:size-7">
        <AttachmentTypeIcon attachment={attachment} />
      </span>
      <div className="space-y-1">
        <p className="break-all font-medium text-foreground">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">
          {attachmentViewerTypeLabel(attachment)} · {formatBytes(attachment.sizeBytes)} ·{" "}
          {attachment.mimeType || "Unknown type"}
        </p>
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
}: {
  readonly attachment: AttachmentViewerItem;
  readonly sourceUrl: string;
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
      description="This file type is not rendered inline. Use the safe reveal actions below."
    />
  );
}

function LocalAttachmentContent({ attachment }: { readonly attachment: AttachmentViewerItem }) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!attachment.file || typeof URL === "undefined") {
      setSourceUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(attachment.file);
    setSourceUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [attachment.file]);

  if (sourceUrl === null) {
    return <AttachmentMetadata attachment={attachment} description="Preparing local preview…" />;
  }
  return <AttachmentMediaPreview attachment={attachment} sourceUrl={sourceUrl} />;
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
        <LoaderCircle className="size-5 animate-spin" aria-label="Loading attachment" />
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
              {attachmentViewerTypeLabel(attachment)} · {formatBytes(attachment.sizeBytes)}
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
                description="This reference is available on the agent environment."
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
                    <ExternalLinkIcon aria-hidden="true" /> Reveal in Explorer
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
