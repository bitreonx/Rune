import { InfoIcon } from "lucide-react";

import { ComposerControl, ComposerControlIcon } from "./ComposerControl";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";

export function resolveAttachmentCapabilityCopy(supportsNativeImageUpload: boolean) {
  return {
    image: supportsNativeImageUpload
      ? "Images upload directly, up to 10 MB."
      : "Images are shared as file paths because this model has no image input.",
    other: "Audio, video, and folders are shared as paths for the agent to read.",
  };
}

export function ComposerAttachmentCapabilityDetails(props: {
  modelName: string;
  supportsNativeImageUpload: boolean;
  compact?: boolean;
}) {
  const copy = resolveAttachmentCapabilityCopy(props.supportsNativeImageUpload);

  return (
    <div
      className={
        props.compact
          ? "flex flex-col gap-2 p-2"
          : "flex flex-col gap-2.5 p-[var(--floating-content-inset)]"
      }
      data-composer-attachment-capability-details="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-foreground text-xs">Attachment handling</div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{props.modelName}</div>
        </div>
        <InfoIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="grid gap-1.5 text-[11px] leading-4 text-secondary-label">
        <div className="flex items-start gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <span>{copy.image}</span>
        </div>
        <div className="flex items-start gap-2">
          <span
            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/60"
            aria-hidden="true"
          />
          <span>{copy.other}</span>
        </div>
      </div>
    </div>
  );
}

export function ComposerAttachmentCapability(props: {
  modelName: string;
  supportsNativeImageUpload: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <ComposerControl
            type="button"
            size="icon-sm"
            aria-label="Attachment capabilities"
            className="size-7 shrink-0 rounded-full px-0 text-muted-foreground hover:text-foreground"
            data-composer-attachment-capability-trigger="true"
          />
        }
      >
        <ComposerControlIcon icon={InfoIcon} />
      </PopoverTrigger>
      <PopoverPopup
        tooltipStyle
        side="top"
        align="start"
        className="w-64 max-w-[calc(100vw-2rem)] text-left whitespace-normal"
        viewportClassName="p-0"
        data-composer-attachment-capability-popover="true"
      >
        <ComposerAttachmentCapabilityDetails {...props} />
      </PopoverPopup>
    </Popover>
  );
}
