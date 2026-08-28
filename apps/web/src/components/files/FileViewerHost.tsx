import type { EnvironmentId, ScopedThreadRef } from "@rune/contracts";
import { describeWorkspaceFile, type WorkspaceFileKind } from "@rune/shared/fileKind";
import { useMemo } from "react";

import { ImageViewer, MediaViewer } from "./viewers/ImageViewer";
import { JsonViewer } from "./viewers/JsonViewer";
import { SvgViewer } from "./viewers/SvgViewer";

export interface FileViewerContext {
  readonly environmentId: EnvironmentId;
  readonly threadRef: ScopedThreadRef;
  readonly cwd: string;
  readonly relativePath: string;
  /** Bumped on every observed disk change; busts binary asset caches. */
  readonly revision: number;
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
  readonly byteLength: number;
  readonly mode: ViewerMode;
}) {
  const { descriptor, context } = props;

  switch (descriptor.kind) {
    case "image":
      return (
        <ImageViewer
          environmentId={context.environmentId}
          threadRef={context.threadRef}
          cwd={context.cwd}
          relativePath={context.relativePath}
          name={descriptor.name}
          revision={context.revision}
        />
      );
    case "svg":
      if (props.mode === "preview") {
        return (
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
      return null;
    case "audio":
    case "video":
      return (
        <MediaViewer
          environmentId={context.environmentId}
          threadRef={context.threadRef}
          cwd={context.cwd}
          relativePath={context.relativePath}
          name={descriptor.name}
          revision={context.revision}
        />
      );
    case "json":
      if (props.mode === "preview") {
        return (
          <JsonViewer
            relativePath={context.relativePath}
            contents={props.contents}
            byteLength={props.byteLength}
          />
        );
      }
      return null;
    default:
      return null;
  }
}

export function useFileDescriptor(
  environmentId: EnvironmentId,
  cwd: string,
  relativePath: string | null,
): FileViewerDescriptor | null {
  return useMemo(
    () =>
      relativePath === null
        ? null
        : describeWorkspaceFile({ environmentId, cwd, relativePath }),
    [cwd, environmentId, relativePath],
  );
}
