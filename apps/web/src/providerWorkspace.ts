import type {
  ProviderInstanceConfig,
  ProviderInstanceConfigMap,
  ProviderInstanceId,
  ServerProvider,
} from "@rune/contracts";
import {
  buildProviderWorkspaceSummary,
  type ProviderConnectionCategory,
  type ProviderWorkspaceSummary,
} from "@rune/contracts";

export interface ProviderWorkspaceEntry extends ProviderWorkspaceSummary {
  readonly config: ProviderInstanceConfig;
  readonly snapshot: ServerProvider | undefined;
}

export interface ProviderWorkspaceGroups {
  readonly subscriptions: ReadonlyArray<ProviderWorkspaceEntry>;
  readonly api: ReadonlyArray<ProviderWorkspaceEntry>;
  readonly local: ReadonlyArray<ProviderWorkspaceEntry>;
  readonly remote: ReadonlyArray<ProviderWorkspaceEntry>;
}

const CATEGORY_ORDER: ReadonlyArray<ProviderConnectionCategory> = [
  "subscription",
  "api",
  "local",
  "remote",
];

function sortEntries(left: ProviderWorkspaceEntry, right: ProviderWorkspaceEntry): number {
  return left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" });
}

export function buildProviderWorkspaceEntries(input: {
  readonly configs?: ProviderInstanceConfigMap;
  readonly snapshots: ReadonlyArray<ServerProvider>;
  readonly modelPreferences?: Readonly<Record<string, unknown>>;
}): ReadonlyArray<ProviderWorkspaceEntry> {
  const configs = input.configs ?? {};
  const snapshotById = new Map(input.snapshots.map((snapshot) => [snapshot.instanceId, snapshot]));
  const instanceIds = new Set<string>([
    ...Object.keys(configs),
    ...input.snapshots.map((snapshot) => String(snapshot.instanceId)),
  ]);
  return [...instanceIds]
    .flatMap((rawInstanceId) => {
      const instanceId = rawInstanceId as ProviderInstanceId;
      const snapshot = snapshotById.get(instanceId);
      const config =
        configs[instanceId] ??
        (snapshot
          ? {
              driver: snapshot.driver,
              ...(snapshot.displayName ? { displayName: snapshot.displayName } : {}),
              enabled: snapshot.enabled,
            }
          : undefined);
      if (!config) return [];
      return [
        {
          ...buildProviderWorkspaceSummary({
            config: { ...config, instanceId },
            ...(snapshot ? { snapshot } : {}),
            modelPreferences: input.modelPreferences?.[rawInstanceId],
          }),
          config,
          snapshot,
        },
      ];
    })
    .sort(sortEntries);
}

export function groupProviderWorkspaceEntries(
  entries: ReadonlyArray<ProviderWorkspaceEntry>,
): ProviderWorkspaceGroups {
  const groups = Object.fromEntries(
    CATEGORY_ORDER.map((category) => [category, [] as ProviderWorkspaceEntry[]]),
  ) as Record<ProviderConnectionCategory, ProviderWorkspaceEntry[]>;
  for (const entry of entries) groups[entry.category].push(entry);
  return {
    subscriptions: groups.subscription,
    api: groups.api,
    local: groups.local,
    remote: groups.remote,
  };
}
