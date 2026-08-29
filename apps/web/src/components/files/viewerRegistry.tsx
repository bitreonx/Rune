import { LoaderCircle } from "lucide-react";
import type { ComponentType, ReactElement } from "react";

import type { EnvironmentId, ScopedThreadRef } from "@rune/contracts";

import type { FileDescriptor } from "./viewerDescriptor.ts";
import { BinaryViewer } from "./viewers/BinaryViewer.tsx";
import { CodeViewer } from "./viewers/CodeViewer.tsx";
import { ImageViewer } from "./viewers/ImageViewer.tsx";
import { JsonViewer } from "./viewers/JsonViewer.tsx";
import { MarkdownViewer } from "./viewers/MarkdownViewer.tsx";
import { PdfViewer } from "./viewers/PdfViewer.tsx";
import { SvgViewer } from "./viewers/SvgViewer.tsx";
import { TruncatedTextViewer } from "./viewers/TruncatedTextViewer.tsx";
import { buildWorkspaceFileRef } from "./filePreviewWorkspaceRef.ts";
import { ALL_KINDS, selectViewerId } from "./viewerRegistry.logic.ts";

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
  readonly byteLength: number;
  readonly revision: number;
  readonly resolvedTheme: "light" | "dark";
  readonly wordWrap: boolean;
  readonly revealRequestId: number;
  readonly onPendingChange: (relativePath: string, pending: boolean) => void;
  readonly onToggleWordWrap: () => void;
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

function LoadingPlaceholder(_props: ViewerProps): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
      <LoaderCircle className="size-5 animate-spin" />
    </div>
  );
}

function fileRefFor(props: ViewerProps) {
  const fileRef = buildWorkspaceFileRef({
    environmentId: props.environmentId,
    cwd: props.cwd,
    projectWorkspaceRoot: undefined,
    projectId: undefined,
    relativePath: props.descriptor.relativePath,
  });
  if (!fileRef) {
    throw new Error(
      `Viewer requires a workspace cwd but received none for ${props.descriptor.relativePath}`,
    );
  }
  return fileRef;
}

const BinaryViewerAdapter: ComponentType<ViewerProps> = (props) => (
  <BinaryViewer
    contents={props.contents}
    byteLength={props.byteLength}
    relativePath={props.descriptor.relativePath}
  />
);

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
  component: BinaryViewerAdapter,
};

// Wrap the SVG viewer so it conforms to ViewerProps. The viewer itself
// only needs (contents, resolvedTheme); the rest of the surface is
// forwarded for symmetry with the rest of the registry.
const SvgViewerAdapter: ComponentType<ViewerProps> = (props) => (
  <SvgViewer
    environmentId={props.environmentId}
    threadRef={props.threadRef}
    cwd={props.cwd}
    relativePath={props.descriptor.relativePath}
    name={props.descriptor.relativePath.split("/").pop() ?? props.descriptor.relativePath}
    revision={props.revision}
  />
);

const svgViewer: Viewer = {
  id: "svg",
  match: (d) => d.kind === "svg",
  component: SvgViewerAdapter,
};

const JsonViewerAdapter: ComponentType<ViewerProps> = (props) => (
  <JsonViewer
    relativePath={props.descriptor.relativePath}
    contents={props.contents}
    byteLength={props.byteLength}
  />
);

const jsonViewer: Viewer = {
  id: "json",
  match: (d) => d.kind === "json",
  component: JsonViewerAdapter,
};

const TruncatedTextViewerAdapter: ComponentType<ViewerProps> = (props) => (
  <TruncatedTextViewer
    contents={props.contents}
    relativePath={props.descriptor.relativePath}
    byteLength={props.byteLength}
    resolvedTheme={props.resolvedTheme}
  />
);

const truncatedTextViewer: Viewer = {
  id: "truncated-text",
  match: (d) => d.kind === "truncated-text",
  component: TruncatedTextViewerAdapter,
};

// The image viewer needs a WorkspaceFileRef; the registry hands it
// props that include (environmentId, cwd, relativePath). The shell
// builds the ref for the viewer so the registry stays typed.
// `cwd` is required on the shell's prop bag, so the ref is guaranteed
// non-null here; the assert keeps the type narrowed without changing
// the runtime contract.
const ImageViewerAdapter: ComponentType<ViewerProps> = (props) => {
  return (
    <ImageViewer
      environmentId={props.environmentId}
      threadRef={props.threadRef}
      cwd={props.cwd}
      relativePath={props.descriptor.relativePath}
      name={props.descriptor.relativePath.split("/").pop() ?? props.descriptor.relativePath}
      revision={props.revision}
    />
  );
};

const imageViewer: Viewer = {
  id: "image",
  match: (d) => d.kind === "image",
  component: ImageViewerAdapter,
};

const codeViewer: Viewer = {
  id: "code",
  match: (d) => d.kind === "text" || d.kind === "code",
  component: (props) => (
    <CodeViewer
      contents={props.contents}
      relativePath={props.descriptor.relativePath}
      wordWrap={props.wordWrap}
      onToggleWordWrap={props.onToggleWordWrap}
    />
  ),
};

const MediaViewerAdapter: ComponentType<ViewerProps> = (props) => (
  <MediaViewer
    environmentId={props.environmentId}
    threadRef={props.threadRef}
    cwd={props.cwd}
    relativePath={props.descriptor.relativePath}
    name={props.descriptor.relativePath.split("/").pop() ?? props.descriptor.relativePath}
    revision={props.revision}
  />
);

const mediaViewer: Viewer = {
  id: "media",
  match: (d) => d.kind === "audio" || d.kind === "video",
  component: MediaViewerAdapter,
};

// The markdown viewer needs an `onPersist` for task-list checkbox
// toggles. Until the shell is wired up, the registry's `ViewerProps`
// carries `onPendingChange` for the panel to observe; the adapter
// forwards that as the persist signal. The shell will replace this
// with a real save coordinator when it takes over from FilePreviewPanel.
const MarkdownViewerAdapter: ComponentType<ViewerProps> = (props) => (
  <MarkdownViewer
    environmentId={props.environmentId}
    cwd={props.cwd}
    relativePath={props.descriptor.relativePath}
    contents={props.contents}
    threadRef={props.threadRef}
    onPersist={() => props.onPendingChange(props.descriptor.relativePath, true)}
  />
);

const markdownViewer: Viewer = {
  id: "markdown",
  match: (d) => d.kind === "markdown",
  component: MarkdownViewerAdapter,
};

const pdfViewer: Viewer = {
  id: "pdf",
  match: (d) => d.kind === "pdf",
  component: (props) => (
    <PdfViewer
      environmentId={props.environmentId}
      threadRef={props.threadRef}
      fileRef={fileRefFor(props)}
      relativePath={props.descriptor.relativePath}
    />
  ),
};

const browserPreviewViewer: Viewer = {
  id: "browser-preview",
  match: (d) => d.kind === "browser-preview",
  component: BinaryViewerAdapter,
};

/**
 * The default registry. Each viewer is intentionally lightweight — the
 * real work happens in the imported components (image, markdown, text,
 * truncated). The shell selects the first viewer whose `match` returns
 * true, falling back to the binary viewer.
 */
export const viewerRegistry: ReadonlyArray<Viewer> = [
  imageViewer,
  markdownViewer,
  svgViewer,
  jsonViewer,
  mediaViewer,
  codeViewer,
  truncatedTextViewer,
  pdfViewer,
  browserPreviewViewer,
  binaryViewer,
];

/**
 * The shell calls this once per open file. Pure: same descriptor → same
 * viewer. Order is preserved; the binary viewer is always last so it
 * acts as the catch-all.
 */
export function selectViewer(descriptor: FileDescriptor): Viewer {
  const viewerId = selectViewerId(descriptor);
  return viewerRegistry.find((viewer) => viewer.id === viewerId) ?? binaryViewer;
}

export { ALL_KINDS } from "./viewerRegistry.logic.ts";

/**
 * For tests: the loader fallback the shell uses while file data is
 * still in flight. Not exposed via the public registry on purpose — it
 * belongs to the shell's loading path, not the kind-dispatch path.
 */
export const _testing = { loadingViewer };
