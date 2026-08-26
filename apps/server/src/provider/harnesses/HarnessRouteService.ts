/**
 * HarnessRouteService — route resolution and route-version tracking.
 *
 * Single source of truth for:
 *   - Composer default models
 *   - Text-generation titles
 *   - Adapter role resolution (main, reasoning, fast, subagent)
 *   - Subagent spawning
 *
 * @module provider/harnesses/HarnessRouteService
 */
import {
  type HarnessProfileConfig,
  type HarnessRole,
  type ModelServiceKind,
  type ProfileId,
  type ServerSettings,
  ServerSettingsError,
} from "@rune/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import { ServerSettingsService } from "../../serverSettings.ts";

export interface ResolvedRoute {
  readonly model: string;
  readonly serviceKind: ModelServiceKind;
  readonly routeVersion: number;
  readonly stale: boolean;
}

export function resolveRouteFromSettings(
  settings: ServerSettings,
  input: {
    readonly profileId: ProfileId | string;
    readonly role: HarnessRole;
    readonly sinceVersion?: number | undefined;
  },
): ResolvedRoute {
  const profile = settings.harnesses.profiles[input.profileId as ProfileId];
  if (!profile) {
    return {
      model: "default",
      serviceKind: "native",
      routeVersion: 1,
      stale: false,
    };
  }

  const roleModel =
    !profile.route.sameModelEverywhere && profile.route.roleOverrides?.[input.role]
      ? profile.route.roleOverrides[input.role]
      : profile.route.defaultModel;

  const serviceId = profile.route.modelServiceId;
  const service =
    serviceId === "native" ? undefined : settings.harnesses.services[serviceId];

  const serviceKind: ModelServiceKind = service?.kind ?? "native";
  const routeVersion = profile.routeVersion ?? 1;
  const stale =
    typeof input.sinceVersion === "number" && input.sinceVersion < routeVersion;

  return {
    model: roleModel || "default",
    serviceKind,
    routeVersion,
    stale,
  };
}

export class HarnessRouteService extends Context.Service<
  HarnessRouteService,
  {
    resolve(input: {
      readonly profileId: ProfileId | string;
      readonly role: HarnessRole;
      readonly sinceVersion?: number | undefined;
    }): Effect.Effect<ResolvedRoute, ServerSettingsError>;
    listProfiles(): Effect.Effect<ReadonlyArray<HarnessProfileConfig>, ServerSettingsError>;
    readonly streamRouteChanges: Stream.Stream<ReadonlyArray<HarnessProfileConfig>>;
  }
>()("@rune/server/provider/harnesses/HarnessRouteService") {}

const make = Effect.gen(function* () {
  const serverSettings = yield* ServerSettingsService;

  const resolve = (input: {
    readonly profileId: ProfileId | string;
    readonly role: HarnessRole;
    readonly sinceVersion?: number;
  }) =>
    serverSettings.getSettings.pipe(
      Effect.map((settings) => resolveRouteFromSettings(settings, input)),
    );

  const listProfiles = () =>
    serverSettings.getSettings.pipe(
      Effect.map((settings) => Object.values(settings.harnesses.profiles)),
    );

  const streamRouteChanges = serverSettings.streamChanges.pipe(
    Stream.map((settings) => Object.values(settings.harnesses.profiles)),
  );

  return {
    resolve,
    listProfiles,
    streamRouteChanges,
  } satisfies HarnessRouteService["Service"];
});

export const layer = Layer.effect(HarnessRouteService, make);
