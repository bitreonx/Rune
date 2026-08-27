/**
 * Universal Viewer Shell. The single place that knows how to render
 * any file. It accepts the props a viewer needs (environmentId, cwd,
 * threadRef, contents, theme, word-wrap, reveal request id, pending
 * change callback) plus a {@link FileDescriptor}, computes the
 * descriptor via {@link describeFile}, and dispatches to the matching
 * viewer in {@link viewerRegistry} via {@link selectViewer}.
 *
 * The panel above this shell still owns the toolbar (file mode toggles,
 * open-in-browser, refresh, explorer toggle) — viewers only receive
 * the surface they need to render, not the entire preview panel.
 */
import { LoaderCircle } from "lucide-react";
import type { ReactElement } from "react";
import type { EnvironmentId, ScopedThreadRef } from "@rune/contracts";

import { type FileDescriptor, describeFile } from "./viewerDescriptor.ts";
import { type Viewer, type ViewerProps, selectViewer, _testing } from "./viewerRegistry.tsx";

/**
 * Shape the panel passes in. The shell turns `relativePath` into a
 * descriptor and forwards the rest to the matched viewer.
 */
export type UniversalViewerShellProps = {
  readonly relativePath: string;
  readonly contents: string;
  readonly truncated: boolean;
  readonly isPreviewSupportedInRuntime: boolean;
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly threadRef: ScopedThreadRef;
  readonly resolvedTheme: "light" | "dark";
  readonly wordWrap: boolean;
  readonly revealRequestId: number;
  readonly onPendingChange: (relativePath: string, pending: boolean) => void;
};

/**
 * Render an error in the shell's panel area. The viewer itself raises
 * the error; the shell owns the surrounding chrome.
 */
function ShellError({ message }: { readonly message: string }): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-muted-foreground">
      <div className="max-w-md text-center text-sm">
        <div className="font-medium text-foreground">Preview unavailable</div>
        <div className="mt-1">{message}</div>
      </div>
    </div>
  );
}

/**
 * Build a viewer's prop bag from the shell's input. The shell owns the
 * descriptor, so the viewer doesn't need to recompute it.
 */
function viewerPropsFor(
  props: UniversalViewerShellProps,
  descriptor: FileDescriptor,
): ViewerProps {
  return {
    descriptor,
    environmentId: props.environmentId,
    cwd: props.cwd,
    threadRef: props.threadRef,
    contents: props.contents,
    resolvedTheme: props.resolvedTheme,
    wordWrap: props.wordWrap,
    revealRequestId: props.revealRequestId,
    onPendingChange: props.onPendingChange,
  };
}

/**
 * The shell entry point. Pure: same props → same viewer. A viewer is
 * selected at call time and rendered with the standard prop bag.
 */
export function UniversalViewerShell(props: UniversalViewerShellProps): ReactElement {
  const descriptor = describeFile({
    relativePath: props.relativePath,
    truncated: props.truncated,
    isPreviewSupportedInRuntime: props.isPreviewSupportedInRuntime,
  });
  const viewer: Viewer = selectViewer(descriptor);
  const Viewer = viewer.component;
  return <Viewer {...viewerPropsFor(props, descriptor)} />;
}

export { _testing };
