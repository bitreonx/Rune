import { EnvironmentId, PocketId, ThreadId, type PocketImportInput } from "@rune/contracts";

import { parseScopedThreadKey } from "@rune/client-runtime/environment";
import type { ThreadOrganizationState } from "../threadOrganization";

const IMPORT_EPOCH = new Date(0).toISOString();

function timestamp(value: string | null | undefined): string {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : IMPORT_EPOCH;
}

function orderKey(order: number, id: string): string {
  return `${String(Math.max(0, Math.trunc(order))).padStart(12, "0")}:${id}`.slice(0, 128);
}

function hasCycle(folderId: string, parentById: Readonly<Record<string, string | null>>): boolean {
  const seen = new Set<string>([folderId]);
  let parent = parentById[folderId] ?? null;
  while (parent !== null) {
    if (seen.has(parent)) return true;
    seen.add(parent);
    parent = parentById[parent] ?? null;
  }
  return false;
}

/**
 * Converts the pre-Pocket browser state into server-owned records. The
 * environment filter is intentional: a Pocket store belongs to one RUNE
 * server/environment, while the old local map could contain many scopes.
 */
export function buildLegacyPocketImport(
  organization: ThreadOrganizationState,
  environmentId: EnvironmentId,
): PocketImportInput {
  const folderIds = new Set(Object.keys(organization.folders));
  const requestedParentById: Record<string, string | null> = {};
  for (const folder of Object.values(organization.folders)) {
    requestedParentById[folder.id] =
      folder.parentId !== null && folderIds.has(folder.parentId) ? folder.parentId : null;
  }
  const parentById: Record<string, string | null> = {};
  for (const folder of Object.values(organization.folders)) {
    const requestedParent = requestedParentById[folder.id] ?? null;
    parentById[folder.id] =
      requestedParent === null || hasCycle(folder.id, requestedParentById) ? null : requestedParent;
  }

  const pockets = Object.values(organization.folders).map((folder) => {
    const parentId = parentById[folder.id] ?? null;
    return {
      id: PocketId.make(folder.id),
      title: folder.name,
      ...(folder.icon === null ? {} : { icon: folder.icon }),
      parentPocketId: parentId === null ? null : PocketId.make(parentId),
      environmentId,
      orderKey: orderKey(folder.order, folder.id),
      archivedAt: folder.archivedAt === null ? null : timestamp(folder.archivedAt),
      trashedAt: folder.trashedAt === null ? null : timestamp(folder.trashedAt),
      createdAt: timestamp(folder.createdAt),
      updatedAt: timestamp(folder.updatedAt),
    };
  });

  const threadMemberships = Object.entries(organization.threadFolderByKey).flatMap(
    ([threadKey, folderId], index) => {
      if (folderId === null || !folderIds.has(folderId)) return [];
      const scoped = parseScopedThreadKey(threadKey);
      if (scoped === null || scoped.environmentId !== environmentId) return [];
      return [
        {
          pocketId: PocketId.make(folderId),
          threadId: ThreadId.make(scoped.threadId),
          orderKey: orderKey(index, scoped.threadId),
        },
      ];
    },
  );

  return {
    snapshot: {
      pockets,
      threadMemberships,
      fileReferences: [],
    },
  };
}
