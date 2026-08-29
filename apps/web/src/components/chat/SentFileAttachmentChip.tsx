import {
  EllipsisIcon,
  EyeIcon,
  FileIcon,
  FileTextIcon,
  FolderOpenIcon,
  ImageIcon,
  Music2Icon,
  VideoIcon,
} from "lucide-react";
import { memo } from "react";

import type { ChatFileAttachment } from "../../types";
import { formatBytes } from "../files/viewers/formatBytes";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../ui/menu";
import { cn } from "~/lib/utils";

function attachmentTypeLabel(attachment: ChatFileAttachment): string {
  if (attachment.kind === "folder") return "Folder";

  const mimeType = attachment.mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "application/octet-stream" || mimeType.includes("binary")) return "Binary";
  return "File";
}

function AttachmentIcon({ attachment }: { attachment: ChatFileAttachment }) {
  if (attachment.kind === "folder") return <FolderOpenIcon aria-hidden="true" />;

  const mimeType = attachment.mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (mimeType.startsWith("video/")) return <VideoIcon aria-hidden="true" />;
  if (mimeType.startsWith("audio/")) return <Music2Icon aria-hidden="true" />;
  if (mimeType.startsWith("image/")) return <ImageIcon aria-hidden="true" />;
  if (mimeType === "application/pdf") return <FileTextIcon aria-hidden="true" />;
  return <FileIcon aria-hidden="true" />;
}

export const SentFileAttachmentChip = memo(function SentFileAttachmentChip(props: {
  attachment: ChatFileAttachment;
  onOpenAttachment: (attachment: ChatFileAttachment) => void;
}) {
  const { attachment } = props;
  const typeLabel = attachmentTypeLabel(attachment);
  const accessibleName = `${attachment.name} · ${typeLabel}`;

  const openAttachment = () => props.onOpenAttachment(attachment);

  return (
    <div
      className={cn(
        "group flex min-w-0 max-w-full items-center gap-1 rounded-lg border border-border/75 bg-background/75 px-1.5 py-1 shadow-sm transition-[border-color,background-color,transform] duration-200 hover:-translate-y-px hover:border-primary/45 hover:bg-background",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
      data-sent-file-attachment="true"
      data-sent-file-attachment-kind={attachment.kind}
      data-sent-file-attachment-type={typeLabel.toLowerCase()}
    >
      <button
        type="button"
        className="flex min-h-10 min-w-0 max-w-[min(24rem,calc(100vw-8rem))] items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={openAttachment}
        aria-label={`Open ${accessibleName}`}
        title={accessibleName}
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-secondary-label [&>svg]:size-4"
          aria-hidden="true"
        >
          <AttachmentIcon attachment={attachment} />
        </span>
        <span className="min-w-0 truncate text-xs text-foreground">
          <span className="font-medium">{attachment.name}</span>
          <span className="text-muted-foreground">
            {` · ${formatBytes(attachment.sizeBytes)} · ${typeLabel}`}
          </span>
        </span>
      </button>
      <Menu>
        <MenuTrigger
          render={
            <button
              type="button"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Attachment actions for ${attachment.name}`}
            />
          }
        >
          <EllipsisIcon className="size-4" aria-hidden="true" />
        </MenuTrigger>
        <MenuPopup align="end" side="top" className="min-w-48">
          <MenuItem onClick={openAttachment}>
            <EyeIcon className="size-4" aria-hidden="true" /> Open attachment
          </MenuItem>
        </MenuPopup>
      </Menu>
    </div>
  );
});

export { attachmentTypeLabel };
