import {
  EllipsisIcon,
  FileIcon,
  FileTextIcon,
  FolderOpenIcon,
  ImageIcon,
  Music2Icon,
  Trash2Icon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { memo } from "react";

import { formatBytes } from "../files/viewers/formatBytes";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "../ui/menu";
import { cn } from "~/lib/utils";
import type { ComposerFileAttachment } from "../../composerDraftStore";
import type { AttachmentUploadState } from "../../lib/attachmentUploadState";
import { formatAttachmentUploadProgress } from "../../lib/attachmentUploadState";

export const COMPOSER_FILE_ATTACHMENT_ACTIONS = [
  "Preview",
  "Reveal in RUNE Files",
  "Reveal in system Explorer",
  "Remove",
] as const;

function attachmentKindLabel(attachment: ComposerFileAttachment): string {
  if (attachment.kind === "folder") return "Folder";
  if (attachment.mimeType.startsWith("video/")) return "Video";
  if (attachment.mimeType.startsWith("audio/")) return "Audio";
  if (attachment.mimeType.startsWith("image/")) return "Image";
  if (attachment.mimeType === "application/pdf") return "PDF";
  return "File";
}

function AttachmentIcon({ attachment }: { attachment: ComposerFileAttachment }) {
  if (attachment.kind === "folder") return <FolderOpenIcon aria-hidden="true" />;
  if (attachment.mimeType.startsWith("video/")) return <VideoIcon aria-hidden="true" />;
  if (attachment.mimeType.startsWith("audio/")) return <Music2Icon aria-hidden="true" />;
  if (attachment.mimeType.startsWith("image/")) return <ImageIcon aria-hidden="true" />;
  if (attachment.mimeType === "application/pdf") return <FileTextIcon aria-hidden="true" />;
  return <FileIcon aria-hidden="true" />;
}

export const ComposerFileAttachmentChip = memo(function ComposerFileAttachmentChip(props: {
  attachment: ComposerFileAttachment;
  onPreview: () => void;
  onRevealInFiles: () => void;
  onRevealInExplorer: () => void;
  onRemove: () => void;
  upload?: AttachmentUploadState;
  onRetryUpload?: () => void;
}) {
  const { attachment } = props;
  const kindLabel = attachmentKindLabel(attachment);
  const accessibleName = `${attachment.name} · ${kindLabel}`;
  const upload = props.upload;
  const uploadMessage =
    upload?.status === "uploading"
      ? `Uploading ${formatAttachmentUploadProgress(upload.progress)}`
      : upload?.status === "failed"
        ? upload.reason
        : null;

  return (
    <div
      className="group flex min-w-0 max-w-full items-center gap-1 rounded-lg border border-border/75 bg-background/75 px-1.5 py-1 shadow-sm transition-[border-color,background-color,transform] duration-200 hover:-translate-y-px hover:border-primary/45 hover:bg-background motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      data-composer-file-attachment="true"
      data-composer-file-attachment-kind={attachment.kind}
      data-composer-file-attachment-upload-status={upload?.status ?? "none"}
    >
      <button
        type="button"
        className="flex min-w-0 max-w-[min(24rem,calc(100vw-8rem))] items-center gap-2 rounded-md px-1.5 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={props.onPreview}
        aria-label={`Preview ${accessibleName}`}
        title={accessibleName}
      >
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-secondary-label [&>svg]:size-4"
          aria-hidden="true"
        >
          <AttachmentIcon attachment={attachment} />
        </span>
        <span className="min-w-0 truncate text-xs text-foreground">
          <span className="font-medium">{attachment.name}</span>
          <span className="text-muted-foreground">
            {` · ${formatBytes(attachment.sizeBytes)} · ${kindLabel}`}
            {uploadMessage ? ` · ${uploadMessage}` : ""}
          </span>
        </span>
      </button>
      <Menu>
        <MenuTrigger
          render={
            <button
              type="button"
              className={cn(
                "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label={`Attachment actions for ${attachment.name}`}
            />
          }
        >
          <EllipsisIcon className="size-4" aria-hidden="true" />
        </MenuTrigger>
        <MenuPopup align="end" side="top" className="min-w-48">
          {upload?.status === "failed" && props.onRetryUpload ? (
            <MenuItem onClick={props.onRetryUpload}>Retry upload</MenuItem>
          ) : null}
          <MenuItem onClick={props.onPreview}>
            <FileIcon className="size-4" /> Preview
          </MenuItem>
          <MenuItem onClick={props.onRevealInFiles}>
            <FolderOpenIcon className="size-4" /> Reveal in RUNE Files
          </MenuItem>
          <MenuItem onClick={props.onRevealInExplorer}>
            <FolderOpenIcon className="size-4" /> Reveal in system Explorer
          </MenuItem>
          <MenuSeparator />
          <MenuItem variant="destructive" onClick={props.onRemove}>
            <Trash2Icon className="size-4" /> Remove
          </MenuItem>
        </MenuPopup>
      </Menu>
      <button
        type="button"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-70 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
        onClick={props.onRemove}
        aria-label={`Remove ${attachment.name}`}
      >
        <XIcon className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
});

export { attachmentKindLabel };
