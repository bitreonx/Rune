import type { ModelCapabilityState, ModelMediaSupport } from "@rune/shared/model";
import { InfoIcon } from "lucide-react";

import { ComposerControl, ComposerControlIcon } from "./ComposerControl";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";

type AttachmentCapabilityInput = {
  readonly image?: ModelCapabilityState;
  readonly audio?: ModelCapabilityState;
  readonly video?: ModelCapabilityState;
  readonly pdf?: ModelCapabilityState;
  readonly folder?: ModelCapabilityState;
};

type AttachmentCapabilityCopy = {
  image: string;
  audio: string;
  video: string;
  pdf: string;
  folder: string;
  transport: string;
  /** Kept for callers of the original image-plus-other copy helper. */
  other: string;
};

const MODEL_ATTACHMENT_CAPABILITIES_LABEL = "Model attachment capabilities";
const TRANSPORT_EVIDENCE_COPY =
  "Transport evidence: RUNE-tested file/path transport is available for attachments; it does not imply native model input.";

const UNKNOWN_MEDIA_SUPPORT: ModelMediaSupport = {
  image: "unknown",
  audio: "unknown",
  video: "unknown",
  pdf: "unknown",
  folder: "unknown",
};

function normalizeAttachmentCapabilityInput(
  input: AttachmentCapabilityInput | ModelMediaSupport | boolean | undefined,
): ModelMediaSupport {
  if (typeof input === "boolean") {
    return {
      ...UNKNOWN_MEDIA_SUPPORT,
      image: input,
    };
  }

  return {
    image: input?.image ?? "unknown",
    audio: input?.audio ?? "unknown",
    video: input?.video ?? "unknown",
    pdf: input?.pdf ?? "unknown",
    folder: input?.folder ?? "unknown",
  };
}

function capabilityStateLabel(
  state: ModelCapabilityState,
): "Available" | "Unavailable" | "Unknown" {
  if (state === true) return "Available";
  if (state === false) return "Unavailable";
  return "Unknown";
}

function capabilityCopy(label: string, state: ModelCapabilityState): string {
  if (state === true) {
    return `Direct provider-advertised model input — this model advertises ${label.toLowerCase()} input.`;
  }
  if (state === false) {
    return `Unavailable — not advertised by the provider. RUNE-tested file/path transport can carry this attachment when a path is available.`;
  }
  return `Unknown — the provider catalog is silent about ${label.toLowerCase()} input.`;
}

export function resolveAttachmentCapabilityCopy(
  input: AttachmentCapabilityInput | ModelMediaSupport | boolean,
): AttachmentCapabilityCopy {
  const mediaSupport = normalizeAttachmentCapabilityInput(input);
  return {
    image: capabilityCopy("Images", mediaSupport.image),
    audio: capabilityCopy("Audio", mediaSupport.audio),
    video: capabilityCopy("Video", mediaSupport.video),
    folder: capabilityCopy("Folders", mediaSupport.folder),
    pdf: capabilityCopy("PDF", mediaSupport.pdf),
    transport: TRANSPORT_EVIDENCE_COPY,
    other: TRANSPORT_EVIDENCE_COPY,
  };
}

function CapabilityStateIndicator({ state }: { state: ModelCapabilityState }) {
  const label = capabilityStateLabel(state);
  const dataState = state === true ? "true" : state === false ? "false" : "unknown";
  return (
    <span
      aria-label={label}
      className={
        state === true
          ? "font-medium text-foreground"
          : state === false
            ? "text-muted-foreground"
            : "text-secondary-label"
      }
      data-composer-attachment-capability-state={dataState}
    >
      {state === true ? "✓" : state === false ? "○" : "Unknown"}
    </span>
  );
}

function CapabilityRow({
  label,
  state,
  description,
}: {
  label: string;
  state: ModelCapabilityState;
  description: string;
}) {
  return (
    <div
      aria-label={`${label}: ${capabilityStateLabel(state)}`}
      className="flex min-h-7 items-center justify-between gap-3 rounded-md px-2 py-1 text-xs"
      data-composer-attachment-capability-row={label.toLowerCase()}
      role="listitem"
      title={description}
    >
      <span className="min-w-0 truncate text-foreground">{label}</span>
      <CapabilityStateIndicator state={state} />
    </div>
  );
}

export function ComposerAttachmentCapabilityDetails(props: {
  modelName: string;
  mediaSupport?: AttachmentCapabilityInput | ModelMediaSupport;
  /** Compatibility for callers from the original image-only capability API. */
  supportsNativeImageUpload?: boolean;
  compact?: boolean;
}) {
  const mediaSupport = normalizeAttachmentCapabilityInput(
    props.mediaSupport ?? props.supportsNativeImageUpload,
  );
  const copy = resolveAttachmentCapabilityCopy(mediaSupport);

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
          <div className="font-medium text-foreground text-xs">Model attachment capabilities</div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{props.modelName}</div>
        </div>
        <InfoIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="grid gap-0.5" role="list" aria-label="Attachment capabilities">
        <CapabilityRow label="Images" state={mediaSupport.image} description={copy.image} />
        <CapabilityRow label="Video" state={mediaSupport.video} description={copy.video} />
        <CapabilityRow label="Audio" state={mediaSupport.audio} description={copy.audio} />
        <CapabilityRow label="Folders" state={mediaSupport.folder} description={copy.folder} />
        <CapabilityRow label="PDF" state={mediaSupport.pdf} description={copy.pdf} />
      </div>
      <p
        className="px-2 text-[11px] leading-4 text-muted-foreground"
        data-composer-attachment-capability-transport="secondary"
      >
        {copy.transport}
      </p>
    </div>
  );
}

export function ComposerAttachmentCapability(props: {
  modelName: string;
  mediaSupport?: AttachmentCapabilityInput | ModelMediaSupport;
  /** Compatibility for callers from the original image-only capability API. */
  supportsNativeImageUpload?: boolean;
  compact?: boolean;
}) {
  const mediaSupport = normalizeAttachmentCapabilityInput(
    props.mediaSupport ?? props.supportsNativeImageUpload,
  );

  return (
    <Popover>
      <PopoverTrigger
        render={
          <ComposerControl
            type="button"
            size="sm"
            aria-label={MODEL_ATTACHMENT_CAPABILITIES_LABEL}
            className={
              props.compact ? "w-full justify-between rounded-sm px-2 text-xs" : "shrink-0 gap-1.5"
            }
            data-composer-attachment-capability-trigger="true"
          />
        }
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {MODEL_ATTACHMENT_CAPABILITIES_LABEL}
        </span>
        <ComposerControlIcon icon={InfoIcon} className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverPopup
        side="top"
        align="start"
        className="w-72 max-w-[calc(100vw-2rem)] text-left whitespace-normal"
        viewportClassName="p-0"
        data-composer-attachment-capability-popover="true"
      >
        <ComposerAttachmentCapabilityDetails
          modelName={props.modelName}
          mediaSupport={mediaSupport}
        />
      </PopoverPopup>
    </Popover>
  );
}
