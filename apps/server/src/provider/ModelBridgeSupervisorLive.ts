import * as NodePath from "node:path";

import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as NetService from "@rune/shared/Net";
import { ServerConfig } from "../config.ts";
import {
  makeModelBridgeSupervisor,
  ModelBridgeSupervisor,
} from "./ModelBridgeSupervisor.ts";

/**
 * Server-owned bridge layer. Keeping this wiring separate from the lifecycle
 * implementation lets pure supervisor tests avoid importing server storage
 * and attachment modules.
 */
export const ModelBridgeSupervisorLive = Layer.unwrap(
  Effect.gen(function* () {
    const serverConfig = yield* ServerConfig;
    return Layer.effect(
      ModelBridgeSupervisor,
      makeModelBridgeSupervisor({
        baseDir: NodePath.join(serverConfig.stateDir, "bridge-instances"),
      }),
    ).pipe(Layer.provide(NetService.layer));
  }),
);

