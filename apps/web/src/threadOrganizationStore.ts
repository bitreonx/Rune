import { create } from "zustand";
import {
  assignThreadToFolder,
  createFolder,
  createThreadOrganizationState,
  decodeThreadOrganizationState,
  moveFolder,
  purgeExpiredTrash,
  resetThreadIcon,
  restoreFolder,
  setFolderArchived,
  setThreadDesign,
  setThreadIcon,
  setTrashRetentionDays,
  trashFolder,
  updateFolder,
  type FolderRecord,
  type ThreadDesign,
  type ThreadOrganizationState,
  type TrashRetentionDays,
} from "./threadOrganization";

export const THREAD_ORGANIZATION_STORAGE_KEY = "rune:thread-organization:v1";

type FolderInput = Pick<FolderRecord, "id" | "name"> &
  Partial<Pick<FolderRecord, "parentId" | "description" | "defaultDesign" | "icon">>;

interface ThreadOrganizationActions {
  createFolder: (input: FolderInput) => void;
  updateFolder: (
    id: string,
    changes: Partial<Pick<FolderRecord, "name" | "description" | "defaultDesign" | "icon">>,
  ) => void;
  moveFolder: (id: string, parentId: string | null) => void;
  archiveFolder: (id: string) => void;
  restoreFolder: (id: string) => void;
  trashFolder: (id: string) => void;
  assignThreadToFolder: (threadKey: string, folderId: string | null) => void;
  setThreadDesign: (threadKey: string, design: ThreadDesign | null) => void;
  setThreadIcon: (threadKey: string, icon: string | null) => void;
  resetThreadIcon: (threadKey: string) => void;
  setTrashRetentionDays: (days: TrashRetentionDays) => void;
  purgeExpiredTrash: () => void;
}

export type ThreadOrganizationStore = ThreadOrganizationState & ThreadOrganizationActions;

function readInitialState(): ThreadOrganizationState {
  if (typeof window === "undefined") return createThreadOrganizationState();
  try {
    const raw = window.localStorage.getItem(THREAD_ORGANIZATION_STORAGE_KEY);
    return raw
      ? decodeThreadOrganizationState(JSON.parse(raw) as Record<string, unknown>)
      : createThreadOrganizationState();
  } catch {
    return createThreadOrganizationState();
  }
}

function persist(state: ThreadOrganizationState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THREAD_ORGANIZATION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Local organization preferences must never interrupt chat use.
  }
}

function timestamp(): string {
  return new Date().toISOString();
}

export const useThreadOrganizationStore = create<ThreadOrganizationStore>((set) => {
  const initial = readInitialState();

  return {
    ...initial,
    createFolder: (input) =>
      set((state) => {
        const next = createFolder(state, input, timestamp());
        persist(next);
        return next;
      }),
    updateFolder: (id, changes) =>
      set((state) => {
        const next = updateFolder(state, id, changes, timestamp());
        persist(next);
        return next;
      }),
    moveFolder: (id, parentId) =>
      set((state) => {
        const next = moveFolder(state, id, parentId, timestamp());
        persist(next);
        return next;
      }),
    archiveFolder: (id) =>
      set((state) => {
        const next = setFolderArchived(state, id, true, timestamp());
        persist(next);
        return next;
      }),
    restoreFolder: (id) =>
      set((state) => {
        const next = restoreFolder(state, id, timestamp());
        persist(next);
        return next;
      }),
    trashFolder: (id) =>
      set((state) => {
        const next = trashFolder(state, id, timestamp());
        persist(next);
        return next;
      }),
    assignThreadToFolder: (threadKey, folderId) =>
      set((state) => {
        const next = assignThreadToFolder(state, threadKey, folderId);
        persist(next);
        return next;
      }),
    setThreadDesign: (threadKey, design) =>
      set((state) => {
        const next = setThreadDesign(state, threadKey, design);
        persist(next);
        return next;
      }),
    setThreadIcon: (threadKey, icon) =>
      set((state) => {
        const next = setThreadIcon(state, threadKey, icon);
        persist(next);
        return next;
      }),
    resetThreadIcon: (threadKey) =>
      set((state) => {
        const next = resetThreadIcon(state, threadKey);
        persist(next);
        return next;
      }),
    setTrashRetentionDays: (days) =>
      set((state) => {
        const next = setTrashRetentionDays(state, days);
        persist(next);
        return next;
      }),
    purgeExpiredTrash: () =>
      set((state) => {
        const next = purgeExpiredTrash(state, Date.now());
        persist(next);
        return next;
      }),
  };
});

// Keep the write path available to non-React integration points without
// exposing an untyped localStorage contract.
export function persistThreadOrganizationState(state: ThreadOrganizationState): void {
  persist(state);
}
