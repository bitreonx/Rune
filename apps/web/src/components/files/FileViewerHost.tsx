import type { EnvironmentId, ScopedThreadRef } from "@rune/contracts";
import { describeWorkspaceFile, type WorkspaceFileKind } from "@rune/shared/fileKind";
import { useMemo, type ReactNode } from "react";

import { BinaryViewer } from "./viewers/BinaryViewer";
import { ImageViewer, MediaViewer } from "./viewers/ImageViewer";
import { JsonViewer } from "./viewers/JsonViewer";
import { PdfViewer } from "./viewers/PdfViewer";
import { SvgViewer } from "./viewers/SvgViewer";
import { ViewerShell } from "./viewers/ViewerShell";
import { buildWorkspaceFileRef } from "./filePreviewWorkspaceRef";

export interface FileViewerContext {
  readonly environmentId: EnvironmentId;
  readonly threadRef: ScopedThreadRef;
  readonly cwd: string;
  readonly relativePath: string;
  /** Bumped on every observed disk change; busts binary asset caches. */
  readonly revision: number;
  readonly originKey?: string;
  readonly onOpenExternally?: () => void;
  readonly onCopyPath?: () => void;
  readonly onAddToChat?: () => void;
  readonly onRevealInFiles?: () => void;
  readonly onRevealInExplorer?: () => void;
  readonly onClose?: () => void;
}

export type ViewerMode = "preview" | "source" | "split" | "rendered";

export interface FileViewerDescriptor {
  readonly name: string;
  readonly extension: string;
  readonly kind: WorkspaceFileKind;
  readonly mime: string;
}

export interface FileViewerCapabilities {
  /** The kind has a rich preview distinct from its source text. */
  readonly previewable: boolean;
  /** The kind is safe and useful to edit as text in place. */
  readonly editable: boolean;
}

const KIND_CAPABILITIES: Record<WorkspaceFileKind, FileViewerCapabilities> = {
  markdown: { previewable: true, editable: true },
  svg: { previewable: true, editable: true },
  image: { previewable: true, editable: false },
  json: { previewable: true, editable: true },
  pdf: { previewable: true, editable: false },
  html: { previewable: true, editable: true },
  audio: { previewable: true, editable: false },
  video: { previewable: true, editable: false },
  text: { previewable: false, editable: true },
  code: { previewable: false, editable: true },
  binary: { previewable: false, editable: false },
  unknown: { previewable: false, editable: true },
};

export function fileViewerCapabilities(kind: WorkspaceFileKind): FileViewerCapabilities {
  return KIND_CAPABILITIES[kind];
}

/**
 * The one place kind → viewer is decided. Adding a viewer means adding a
 * branch here — the explorer, editor, and toolbars never special-case
 * extensions.
 */
export function FilePreviewSurface(props: {
  readonly descriptor: FileViewerDescriptor;
  readonly context: FileViewerContext;
  readonly contents: string;
  readonly byteLength?: number;
  readonly mimeType?: string;
  readonly modifiedAt?: string;
  readonly mode: ViewerMode;
  readonly sha256?: string;
}) {
  const { descriptor, context } = props;
  let content: ReactNode = null;

  switch (descriptor.kind) {
    case "image":
      content = (
        <ImageViewer
          environmentId={context.environmentId}
          threadRef={context.threadRef}
          cwd={context.cwd}
          relativePath={context.relativePath}
          name={descriptor.name}
          revision={context.revision}
        />
      );
      break;
    case "svg":
      if (props.mode === "preview" || props.mode === "split") {
        content = (
          <SvgViewer
            environmentId={context.environmentId}
            threadRef={context.threadRef}
            cwd={context.cwd}
            relativePath={context.relativePath}
            name={descriptor.name}
            revision={context.revision}
          />
        );
      }
      break;
    case "audio":
    case "video":
      content = (
        <MediaViewer
          environmentId={context.environmentId}
          threadRef={context.threadRef}
          cwd={context.cwd}
          relativePath={context.relativePath}
          name={descriptor.name}
          revision={context.revision}
        />
      );
      break;
    case "json":
      if (props.mode === "preview" || props.mode === "split") {
        content = (
          <JsonViewer
            relativePath={context.relativePath}
            contents={props.contents}
            byteLength={props.byteLength ?? props.contents.length}
          />
        );
      }
      break;
    case "pdf": {
      const fileRef = buildWorkspaceFileRef({
        environmentId: context.environmentId,
        cwd: context.cwd,
        projectWorkspaceRoot: undefined,
        projectId: undefined,
        relativePath: context.relativePath,
      });
      if (fileRef) {
        content = (
          <PdfViewer
            environmentId={context.environmentId}
            threadRef={context.threadRef}
            fileRef={fileRef}
            relativePath={context.relativePath}
          />
        );
      }
      break;
    }
    case "binary":
    case "unknown":
      content = (
        <BinaryViewer
          contents={props.contents}
          byteLength={props.byteLength}
          {...(props.mimeType !== undefined ? { mimeType: props.mimeType } : {})}
          {...(props.modifiedAt !== undefined ? { modifiedAt: props.modifiedAt } : {})}
          relativePath={context.relativePath}
          {...(props.sha256 !== undefined ? { sha256: props.sha256 } : {})}
          {...(context.onRevealInFiles ? { onRevealInFiles: context.onRevealInFiles } : {})}
          {...(context.onRevealInExplorer
            ? { onRevealInExplorer: context.onRevealInExplorer }
            : {})}
          {...(context.onCopyPath ? { onCopyPath: context.onCopyPath } : {})}
        />
      );
      break;
    default:
      break;
  }

  if (content === null) return null;
  return (
    <ViewerShell
      name={descriptor.name}
      relativePath={context.relativePath}
      kind={descriptor.kind}
      mime={descriptor.mime}
      byteLength={props.byteLength}
      {...(context.originKey !== undefined ? { originKey: context.originKey } : {})}
      {...(context.onOpenExternally ? { onOpenExternally: context.onOpenExternally } : {})}
      {...(context.onCopyPath ? { onCopyPath: context.onCopyPath } : {})}
      {...(context.onAddToChat ? { onAddToChat: context.onAddToChat } : {})}
      {...(context.onClose ? { onClose: context.onClose } : {})}
    >
      {content}
    </ViewerShell>
  );
}

export function useFileDescriptor(
  environmentId: EnvironmentId,
  cwd: string,
  relativePath: string | null,
): FileViewerDescriptor | null {
  return useMemo(
    () =>
      relativePath === null ? null : describeWorkspaceFile({ environmentId, cwd, relativePath }),
    [cwd, environmentId, relativePath],
  );
}
