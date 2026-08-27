export const THREAD_ORGANIZATION_VERSION = 1;
export const DEFAULT_TRASH_RETENTION_DAYS = 5;
export const TRASH_RETENTION_OPTIONS = [1, 5, 14, 30, 90] as const;

export type TrashRetentionDays = (typeof TRASH_RETENTION_OPTIONS)[number];
export type ThreadDesignPreset =
  | "purple-focus"
  | "blue-research"
  | "amber-review"
  | "green-complete"
  | "coral-important"
  | "slate-minimal"
  | "indigo-code"
  | "rose-creative"
  | "cyan-technical"
  | "mono-terminal";

export interface ThreadDesign {
  readonly preset: ThreadDesignPreset;
  readonly pattern: "none" | "dots" | "grid" | "rings" | "paper" | "waves" | "code";
  readonly density: "comfortable" | "compact";
  readonly chatTint: boolean;
}

export interface FolderRecord {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly parentId: string | null;
  readonly order: number;
  readonly defaultDesign: ThreadDesign | null;
  readonly icon: string | null;
  readonly archivedAt: string | null;
  readonly trashedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ThreadDesignOverride {
  readonly design: ThreadDesign | null;
  readonly icon: string | null;
  readonly manualIcon: boolean;
}

export interface ThreadOrganizationState {
  readonly version: typeof THREAD_ORGANIZATION_VERSION;
  readonly folders: Readonly<Record<string, FolderRecord>>;
  readonly threadFolderByKey: Readonly<Record<string, string | null>>;
  readonly threadTrashedAtByKey: Readonly<Record<string, string>>;
  readonly threadDesignByKey: Readonly<Record<string, ThreadDesignOverride>>;
  readonly detectedIconByProjectKey: Readonly<Record<string, string>>;
  readonly trashRetentionDays: TrashRetentionDays;
}

export interface ThreadOrganizationSnapshot {
  readonly version?: number;
  readonly folders?: unknown;
  readonly threadFolderByKey?: unknown;
  readonly threadTrashedAtByKey?: unknown;
  readonly threadDesignByKey?: unknown;
  readonly detectedIconByProjectKey?: unknown;
  readonly trashRetentionDays?: unknown;
}

export const DEFAULT_THREAD_DESIGN: ThreadDesign = {
  preset: "slate-minimal",
  pattern: "none",
  density: "comfortable",
  chatTint: false,
};

export const THREAD_DESIGN_PRESETS: ReadonlyArray<{
  readonly id: ThreadDesignPreset;
  readonly label: string;
  readonly pattern: ThreadDesign["pattern"];
}> = [
  { id: "purple-focus", label: "Purple Focus", pattern: "rings" },
  { id: "blue-research", label: "Blue Research", pattern: "grid" },
  { id: "amber-review", label: "Amber Review", pattern: "dots" },
  { id: "green-complete", label: "Green Complete", pattern: "none" },
  { id: "coral-important", label: "Coral Important", pattern: "waves" },
  { id: "slate-minimal", label: "Slate Minimal", pattern: "none" },
  { id: "indigo-code", label: "Indigo Code", pattern: "code" },
  { id: "rose-creative", label: "Rose Creative", pattern: "paper" },
  { id: "cyan-technical", label: "Cyan Technical", pattern: "grid" },
  { id: "mono-terminal", label: "Mono Terminal", pattern: "code" },
];

export function designForPreset(preset: ThreadDesignPreset): ThreadDesign {
  return {
    preset,
    pattern: THREAD_DESIGN_PRESETS.find((candidate) => candidate.id === preset)?.pattern ?? "none",
    density: "comfortable",
    chatTint: false,
  };
}

export function createThreadOrganizationState(): ThreadOrganizationState {
  return {
    version: THREAD_ORGANIZATION_VERSION,
    folders: {},
    threadFolderByKey: {},
    threadTrashedAtByKey: {},
    threadDesignByKey: {},
    detectedIconByProjectKey: {},
    trashRetentionDays: DEFAULT_TRASH_RETENTION_DAYS,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function validString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validPreset(value: unknown): value is ThreadDesignPreset {
  return THREAD_DESIGN_PRESETS.some((preset) => preset.id === value);
}

function decodeDesign(value: unknown): ThreadDesign | null {
  if (!isRecord(value) || !validPreset(value.preset)) return null;
  const pattern = ["none", "dots", "grid", "rings", "paper", "waves", "code"].includes(
    value.pattern as string,
  )
    ? (value.pattern as ThreadDesign["pattern"])
    : (THREAD_DESIGN_PRESETS.find((preset) => preset.id === value.preset)?.pattern ?? "none");
  return {
    preset: value.preset,
    pattern,
    density: value.density === "compact" ? "compact" : "comfortable",
    chatTint: value.chatTint === true,
  };
}

function decodeFolder(value: unknown): FolderRecord | null {
  if (!isRecord(value) || !validString(value.id) || !validString(value.name)) return null;
  const createdAt = validString(value.createdAt) ? value.createdAt : new Date(0).toISOString();
  const updatedAt = validString(value.updatedAt) ? value.updatedAt : createdAt;
  return {
    id: value.id,
    name: value.name.trim().slice(0, 120),
    description: typeof value.description === "string" ? value.description.slice(0, 500) : "",
    parentId: typeof value.parentId === "string" ? value.parentId : null,
    order: typeof value.order === "number" && Number.isFinite(value.order) ? value.order : 0,
    defaultDesign: decodeDesign(value.defaultDesign),
    icon: typeof value.icon === "string" && value.icon.length > 0 ? value.icon : null,
    archivedAt: typeof value.archivedAt === "string" ? value.archivedAt : null,
    trashedAt: typeof value.trashedAt === "string" ? value.trashedAt : null,
    createdAt,
    updatedAt,
  };
}

export function decodeThreadOrganizationState(
  snapshot: ThreadOrganizationSnapshot,
): ThreadOrganizationState {
  const state = createThreadOrganizationState();
  const folders: Record<string, FolderRecord> = {};
  if (isRecord(snapshot.folders)) {
    for (const value of Object.values(snapshot.folders)) {
      const folder = decodeFolder(value);
      if (folder) folders[folder.id] = folder;
    }
  }
  const threadFolderByKey: Record<string, string | null> = {};
  if (isRecord(snapshot.threadFolderByKey)) {
    for (const [key, value] of Object.entries(snapshot.threadFolderByKey)) {
      if (key && (value === null || typeof value === "string")) threadFolderByKey[key] = value;
    }
  }
  const threadTrashedAtByKey: Record<string, string> = {};
  if (isRecord(snapshot.threadTrashedAtByKey)) {
    for (const [key, value] of Object.entries(snapshot.threadTrashedAtByKey)) {
      if (key && typeof value === "string" && Number.isFinite(Date.parse(value))) {
        threadTrashedAtByKey[key] = value;
      }
    }
  }
  const threadDesignByKey: Record<string, ThreadDesignOverride> = {};
  if (isRecord(snapshot.threadDesignByKey)) {
    for (const [key, value] of Object.entries(snapshot.threadDesignByKey)) {
      if (!isRecord(value)) continue;
      threadDesignByKey[key] = {
        design: decodeDesign(value.design),
        icon: typeof value.icon === "string" && value.icon.length > 0 ? value.icon : null,
        manualIcon: value.manualIcon === true,
      };
    }
  }
  const detectedIconByProjectKey: Record<string, string> = {};
  if (isRecord(snapshot.detectedIconByProjectKey)) {
    for (const [key, value] of Object.entries(snapshot.detectedIconByProjectKey)) {
      if (key && typeof value === "string" && value.length > 0)
        detectedIconByProjectKey[key] = value;
    }
  }
  const retention = TRASH_RETENTION_OPTIONS.find(
    (option) => option === snapshot.trashRetentionDays,
  );
  return {
    ...state,
    folders,
    threadFolderByKey,
    threadTrashedAtByKey,
    threadDesignByKey,
    detectedIconByProjectKey,
    trashRetentionDays: retention ?? DEFAULT_TRASH_RETENTION_DAYS,
  };
}

export function createFolder(
  state: ThreadOrganizationState,
  input: Pick<FolderRecord, "id" | "name"> &
    Partial<Pick<FolderRecord, "parentId" | "description" | "defaultDesign" | "icon">>,
  now: string,
): ThreadOrganizationState {
  const name = input.name.trim().slice(0, 120);
  if (!name || state.folders[input.id]) return state;
  const siblings = Object.values(state.folders).filter(
    (folder) => folder.parentId === (input.parentId ?? null),
  );
  const folder: FolderRecord = {
    id: input.id,
    name,
    description: input.description?.trim().slice(0, 500) ?? "",
    parentId: input.parentId ?? null,
    order: siblings.length,
    defaultDesign: input.defaultDesign ?? null,
    icon: input.icon ?? null,
    archivedAt: null,
    trashedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  return { ...state, folders: { ...state.folders, [folder.id]: folder } };
}

export function updateFolder(
  state: ThreadOrganizationState,
  id: string,
  changes: Partial<Pick<FolderRecord, "name" | "description" | "defaultDesign" | "icon">>,
  now: string,
): ThreadOrganizationState {
  const folder = state.folders[id];
  if (!folder) return state;
  const name = changes.name?.trim().slice(0, 120) ?? folder.name;
  if (!name) return state;
  return {
    ...state,
    folders: {
      ...state.folders,
      [id]: {
        ...folder,
        name,
        description: changes.description?.trim().slice(0, 500) ?? folder.description,
        defaultDesign:
          changes.defaultDesign === undefined ? folder.defaultDesign : changes.defaultDesign,
        icon: changes.icon === undefined ? folder.icon : changes.icon,
        updatedAt: now,
      },
    },
  };
}

function isDescendant(
  state: ThreadOrganizationState,
  candidateId: string,
  ancestorId: string,
): boolean {
  let current = state.folders[candidateId]?.parentId ?? null;
  const seen = new Set<string>();
  while (current !== null && !seen.has(current)) {
    if (current === ancestorId) return true;
    seen.add(current);
    current = state.folders[current]?.parentId ?? null;
  }
  return false;
}

export function moveFolder(
  state: ThreadOrganizationState,
  id: string,
  parentId: string | null,
  now: string,
): ThreadOrganizationState {
  const folder = state.folders[id];
  if (
    !folder ||
    parentId === id ||
    (parentId !== null && !state.folders[parentId]) ||
    (parentId !== null && isDescendant(state, parentId, id))
  )
    return state;
  return {
    ...state,
    folders: { ...state.folders, [id]: { ...folder, parentId, updatedAt: now } },
  };
}

function descendantIds(state: ThreadOrganizationState, id: string): string[] {
  const result: string[] = [];
  for (const folder of Object.values(state.folders)) {
    if (folder.parentId === id) result.push(folder.id, ...descendantIds(state, folder.id));
  }
  return result;
}

export function setFolderArchived(
  state: ThreadOrganizationState,
  id: string,
  archived: boolean,
  now: string,
): ThreadOrganizationState {
  if (!state.folders[id]) return state;
  const ids = [id, ...descendantIds(state, id)];
  const folders = { ...state.folders };
  for (const folderId of ids) {
    const folder = folders[folderId];
    if (folder)
      folders[folderId] = { ...folder, archivedAt: archived ? now : null, updatedAt: now };
  }
  return { ...state, folders };
}

export function trashFolder(
  state: ThreadOrganizationState,
  id: string,
  now: string,
): ThreadOrganizationState {
  if (!state.folders[id]) return state;
  const ids = [id, ...descendantIds(state, id)];
  const folders = { ...state.folders };
  for (const folderId of ids) {
    const folder = folders[folderId];
    if (folder) folders[folderId] = { ...folder, trashedAt: now, updatedAt: now };
  }
  const threadTrashedAtByKey = { ...state.threadTrashedAtByKey };
  for (const [threadKey, folderId] of Object.entries(state.threadFolderByKey)) {
    if (folderId !== null && ids.includes(folderId)) threadTrashedAtByKey[threadKey] = now;
  }
  return { ...state, folders, threadTrashedAtByKey };
}

export function restoreFolder(
  state: ThreadOrganizationState,
  id: string,
  now: string,
): ThreadOrganizationState {
  if (!state.folders[id]) return state;
  const ids = [id, ...descendantIds(state, id)];
  const folders = { ...state.folders };
  for (const folderId of ids) {
    const folder = folders[folderId];
    if (folder)
      folders[folderId] = { ...folder, trashedAt: null, archivedAt: null, updatedAt: now };
  }
  const threadTrashedAtByKey = { ...state.threadTrashedAtByKey };
  for (const [threadKey, folderId] of Object.entries(state.threadFolderByKey)) {
    if (folderId !== null && ids.includes(folderId)) delete threadTrashedAtByKey[threadKey];
  }
  return { ...state, folders, threadTrashedAtByKey };
}

export function assignThreadToFolder(
  state: ThreadOrganizationState,
  threadKey: string,
  folderId: string | null,
): ThreadOrganizationState {
  if (!threadKey || (folderId !== null && !state.folders[folderId])) return state;
  return { ...state, threadFolderByKey: { ...state.threadFolderByKey, [threadKey]: folderId } };
}

export function setThreadDesign(
  state: ThreadOrganizationState,
  threadKey: string,
  design: ThreadDesign | null,
): ThreadOrganizationState {
  if (!threadKey) return state;
  return {
    ...state,
    threadDesignByKey: {
      ...state.threadDesignByKey,
      [threadKey]: {
        design,
        icon: state.threadDesignByKey[threadKey]?.icon ?? null,
        manualIcon: state.threadDesignByKey[threadKey]?.manualIcon ?? false,
      },
    },
  };
}

export function setThreadIcon(
  state: ThreadOrganizationState,
  threadKey: string,
  icon: string | null,
): ThreadOrganizationState {
  if (!threadKey) return state;
  const previous = state.threadDesignByKey[threadKey];
  return {
    ...state,
    threadDesignByKey: {
      ...state.threadDesignByKey,
      [threadKey]: { design: previous?.design ?? null, icon, manualIcon: icon !== null },
    },
  };
}

export function resetThreadIcon(
  state: ThreadOrganizationState,
  threadKey: string,
): ThreadOrganizationState {
  const previous = state.threadDesignByKey[threadKey];
  if (!previous) return state;
  return {
    ...state,
    threadDesignByKey: {
      ...state.threadDesignByKey,
      [threadKey]: { ...previous, icon: null, manualIcon: false },
    },
  };
}

export function effectiveThreadDesign(
  state: ThreadOrganizationState,
  threadKey: string,
): ThreadDesign {
  const override = state.threadDesignByKey[threadKey]?.design;
  if (override) return override;
  const folderId = state.threadFolderByKey[threadKey];
  const folder = folderId ? state.folders[folderId] : undefined;
  return folder?.defaultDesign ?? DEFAULT_THREAD_DESIGN;
}

export function visibleFolderIds(
  state: ThreadOrganizationState,
  threadProjectKeysByThreadKey: Readonly<Record<string, string>>,
  projectScopeKey: string | ReadonlySet<string> | null,
  showEmptyFolders: boolean,
): ReadonlySet<string> {
  const matchesProject = (threadKey: string): boolean => {
    const threadProjectKey = threadProjectKeysByThreadKey[threadKey];
    if (projectScopeKey === null) return true;
    return typeof projectScopeKey === "string"
      ? threadProjectKey === projectScopeKey
      : projectScopeKey.has(threadProjectKey ?? "");
  };
  const matching = new Set<string>();
  for (const [threadKey, folderId] of Object.entries(state.threadFolderByKey)) {
    if (folderId === null || !matchesProject(threadKey)) continue;
    if (state.folders[folderId]?.trashedAt === null) matching.add(folderId);
  }
  if (showEmptyFolders) {
    for (const folder of Object.values(state.folders))
      if (folder.trashedAt === null) matching.add(folder.id);
    return matching;
  }
  for (const folderId of matching) {
    let parentId = state.folders[folderId]?.parentId ?? null;
    while (parentId !== null) {
      matching.add(parentId);
      parentId = state.folders[parentId]?.parentId ?? null;
    }
  }
  return matching;
}

export function folderAndDescendantIds(
  state: ThreadOrganizationState,
  folderId: string,
): ReadonlySet<string> {
  if (!state.folders[folderId]) return new Set();
  return new Set([folderId, ...descendantIds(state, folderId)]);
}

export function setTrashRetentionDays(
  state: ThreadOrganizationState,
  days: TrashRetentionDays,
): ThreadOrganizationState {
  return { ...state, trashRetentionDays: days };
}

export function purgeExpiredTrash(
  state: ThreadOrganizationState,
  nowMs: number,
): ThreadOrganizationState {
  const cutoff = nowMs - state.trashRetentionDays * 24 * 60 * 60 * 1000;
  const folders = { ...state.folders };
  for (const [id, folder] of Object.entries(folders)) {
    if (folder.trashedAt && Date.parse(folder.trashedAt) <= cutoff) delete folders[id];
  }
  const threadFolderByKey = Object.fromEntries(
    Object.entries(state.threadFolderByKey).filter(
      ([, folderId]) => folderId === null || folders[folderId],
    ),
  ) as Record<string, string | null>;
  const threadTrashedAtByKey = Object.fromEntries(
    Object.entries(state.threadTrashedAtByKey).filter(([threadKey]) => {
      const folderId = state.threadFolderByKey[threadKey];
      return folderId === null || folderId === undefined || folders[folderId] !== undefined;
    }),
  ) as Record<string, string>;
  return { ...state, folders, threadFolderByKey, threadTrashedAtByKey };
}
