import { LoaderCircle } from "lucide-react";
import type { ComponentType } from "react";

import type { EnvironmentId, ScopedThreadRef } from "@rune/contracts";

import type { FileDescriptor, FileKind } from "./viewerDescriptor.ts";
import { BinaryViewer } from "./viewers/BinaryViewer.tsx";
import { ImageViewer } from "./viewers/ImageViewer.tsx";
import { JsonViewer } from "./viewers/JsonViewer.tsx";
import { SvgViewer } from "./viewers/SvgViewer.tsx";
import { TruncatedTextViewer } from "./viewers/TruncatedTextViewer.tsx";
import { buildWorkspaceFileRef } from "./filePreviewWorkspaceRef.ts";

/**
 * The shape every viewer accepts. The shell hands a subset of the
 * shared surface — the rest stays in the toolbar (markdown mode toggle,
 * open-in-browser, refresh, explorer toggle) where it has always lived.
 *
 * Viewers that need more (a save coordinator, a highlight config, etc.)
 * build it themselves from the inputs they get; the registry never
 * grows a new prop just because one viewer wanted it.
 */
export type ViewerProps = {
  readonly descriptor: FileDescriptor;
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly threadRef: ScopedThreadRef;
  readonly contents: string;
  readonly resolvedTheme: "light" | "dark";
  readonly wordWrap: boolean;
  readonly revealRequestId: number;
  readonly onPendingChange: (relativePath: string, pending: boolean) => void;
};

/**
 * A registered viewer. The `id` is a stable string for telemetry and
 * debugging; `match` decides whether this viewer can render the given
 * descriptor; `component` is the actual React component.
 *
 * Order matters: the registry is searched top-to-bottom and the first
 * match wins. More specific viewers (e.g. markdown) must come before
 * less specific ones (e.g. text).
 */
export type Viewer = {
  readonly id: string;
  readonly match: (descriptor: FileDescriptor) => boolean;
  readonly component: ComponentType<ViewerProps>;
};

// Inline viewers live here as small, self-contained pieces. The bigger
// ones (image, markdown, editable text, the truncated-text virtualizer,
// the SVG/JSON/code viewers) are imported as files once they exist.

function LoadingPlaceholder(): ComponentType<ViewerProps>["render"] extends () => infer R
  ? R
  : never {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
      <LoaderCircle className="size-5 animate-spin" />
    </div>
  );
}

const loadingViewer: Viewer = {
  id: "loading",
  // The shell uses this as a final fallback for `kind: "unknown"` while
  // it's still figuring out what to render. It is not in the public
  // viewerRegistry list — the shell's own error/loading paths cover it.
  match: () => false,
  component: LoadingPlaceholder as ComponentType<ViewerProps>,
};

const binaryViewer: Viewer = {
  id: "binary-fallback",
  match: (d) => d.kind === "unknown" || d.kind === "binary",
  component: BinaryViewer as unknown as ComponentType<ViewerProps>,
};

// Wrap the SVG viewer so it conforms to ViewerProps. The viewer itself
// only needs (contents, resolvedTheme); the rest of the surface is
// forwarded for symmetry with the rest of the registry.
const svgViewer: Viewer = {
  id: "svg",
  match: (d) => d.kind === "svg",
  component: SvgViewer as unknown as ComponentType<ViewerProps>,
};

const jsonViewer: Viewer = {
  id: "json",
  match: (d) => d.kind === "json",
  component: JsonViewer as unknown as ComponentType<ViewerProps>,
};

const truncatedTextViewer: Viewer = {
  id: "truncated-text",
  match: (d) => d.kind === "truncated-text",
  component: TruncatedTextViewer as unknown as ComponentType<ViewerProps>,
};

// The image viewer needs a WorkspaceFileRef; the registry hands it
// props that include (environmentId, cwd, relativePath). The shell
// builds the ref for the viewer so the registry stays typed.
const ImageViewerAdapter: ComponentType<ViewerProps> = (props) => (
  <ImageViewer
    environmentId={props.environmentId}
    threadRef={props.threadRef}
    fileRef={buildWorkspaceFileRef({
      environmentId: props.environmentId,
      cwd: props.cwd,
      projectWorkspaceRoot: undefined,
      projectId: undefined,
      relativePath: props.descriptor.relativePath,
    })}
    relativePath={props.descriptor.relativePath}
  />
);

const imageViewer: Viewer = {
  id: "image",
  match: (d) => d.kind === "image",
  component: ImageViewerAdapter,
};

/**
 * The default registry. Each viewer is intentionally lightweight — the
 * real work happens in the imported components (image, markdown, text,
 * truncated). The shell selects the first viewer whose `match` returns
 * true, falling back to the binary viewer.
 */
export const viewerRegistry: ReadonlyArray<Viewer> = [
  imageViewer,
  svgViewer,
  jsonViewer,
  truncatedTextViewer,
  binaryViewer,
];

/**
 * The shell calls this once per open file. Pure: same descriptor → same
 * viewer. Order is preserved; the binary viewer is always last so it
 * acts as the catch-all.
 */
export function selectViewer(descriptor: FileDescriptor): Viewer {
  for (const viewer of viewerRegistry) {
    if (viewer.match(descriptor)) return viewer;
  }
  return binaryViewer;
}

export const ALL_KINDS: ReadonlyArray<FileKind> = [
  "image",
  "markdown",
  "browser-preview",
  "svg",
  "json",
  "pdf",
  "truncated-text",
  "text",
  "binary",
  "unknown",
];

/**
 * For tests: the loader fallback the shell uses while file data is
 * still in flight. Not exposed via the public registry on purpose — it
 * belongs to the shell's loading path, not the kind-dispatch path.
 */
export const _testing = { loadingViewer };
