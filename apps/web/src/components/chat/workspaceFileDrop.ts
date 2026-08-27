export interface WorkspaceFileDragEvent {
  readonly dataTransfer: {
    readonly types: ReadonlyArray<string>;
    readonly files: Iterable<File>;
    dropEffect: string;
  };
  readonly relatedTarget: EventTarget | null;
  readonly currentTarget: {
    contains(target: Node | null): boolean;
  };
  preventDefault(): void;
}

export interface WorkspaceFileDropHost {
  setDragActive(active: boolean): void;
  addFiles(files: File[]): void;
  /**
   * Optional hint: when the drag came from the in-app workspace file tree
   * (rather than the OS), the drop is a no-op for now — we only show the
   * overlay. The real attach path reads the file bytes via a server call
   * and is out of scope for the overlay's PR.
   */
  isMentionDrag?: (event: WorkspaceFileDragEvent) => boolean;
}

const COMPOSER_MENTION_DRAG_TYPE = "application/x-rune-composer-mention";

function isFileDrag(event: WorkspaceFileDragEvent): boolean {
  if (event.dataTransfer.types.includes("Files")) return true;
  // The workspace file tree's drag-and-drop reuses the same overlay so the
  // user gets a single consistent "drop here" target. The actual attach is
  // still a no-op for tree drags — the real path lives in PR 2.
  return event.dataTransfer.types.includes(COMPOSER_MENTION_DRAG_TYPE);
}

function movedWithinDropTarget(event: WorkspaceFileDragEvent): boolean {
  return event.relatedTarget !== null && event.currentTarget.contains(event.relatedTarget as Node);
}

export interface WorkspaceFileDropHandlers {
  onDragEnter(event: WorkspaceFileDragEvent): void;
  onDragOver(event: WorkspaceFileDragEvent): void;
  onDragLeave(event: WorkspaceFileDragEvent): void;
  onDrop(event: WorkspaceFileDragEvent): void;
}

export function makeWorkspaceFileDropHandlers(
  host: WorkspaceFileDropHost,
): WorkspaceFileDropHandlers {
  return {
    onDragEnter(event: WorkspaceFileDragEvent) {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      if (movedWithinDropTarget(event)) return;
      host.setDragActive(true);
    },
    onDragOver(event: WorkspaceFileDragEvent) {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      host.setDragActive(true);
    },
    onDragLeave(event: WorkspaceFileDragEvent) {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      if (movedWithinDropTarget(event)) return;
      host.setDragActive(false);
    },
    onDrop(event: WorkspaceFileDragEvent) {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      host.setDragActive(false);
      // Tree drags are visual only on the overlay; the existing mention-insert
      // flow handles the actual drop. Bail before touching `files`, which is
      // empty for tree drags anyway.
      if (host.isMentionDrag?.(event)) return;
      host.addFiles(Array.from(event.dataTransfer.files));
    },
  };
}
