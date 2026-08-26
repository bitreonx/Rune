/**
 * ModelCatalogHttp — HTTP handler layer for `/api/providers/model-catalog`.
 *
 * @module provider/harnesses/ModelCatalogHttp
 */
import {
  EnvironmentHttpApi,
  type ProviderModelCatalogRequest,
  type ProviderModelCatalogResponse,
} from "@rune/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as ServerSecretStore from "../../auth/ServerSecretStore.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import { ModelCatalogService } from "./ModelCatalogService.ts";

const textDecoder = new TextDecoder();

export const serverProvidersHttpApiLayer = HttpApiBuilder.group(
  EnvironmentHttpApi,
  "providers",
  Effect.fnUntraced(function* (handlers) {
    const catalogService = yield* ModelCatalogService;
    const serverSettings = yield* ServerSettingsService;
    const secretStore = yield* ServerSecretStore.ServerSecretStore;

    return handlers.handle("providerModelCatalog", (args) =>
      Effect.gen(function* () {
        const payload = args.payload as ProviderModelCatalogRequest;
        const settings = yield* serverSettings.getSettings.pipe(
          Effect.orElseSucceed(() => undefined),
        );

        let credential: string | undefined = undefined;
        let baseUrl = payload.baseUrl;

        // Resolve service configuration if known
        if (settings?.harnesses?.services) {
          const service = settings.harnesses.services[payload.serviceId as never];
          if (service) {
            if (!baseUrl && service.baseUrl) {
              baseUrl = service.baseUrl;
            }
            if (service.credentialRef) {
              const secret = yield* secretStore.get(service.credentialRef).pipe(
                Effect.orElseSucceed(() => Option.none()),
              );
              if (Option.isSome(secret)) {
                credential = textDecoder.decode(secret.value);
              }
            }
          }
        }

        // Direct secret lookup fallback: model-service:<serviceId>:api-key
        if (!credential) {
          const secret = yield* secretStore
            .get(`model-service:${payload.serviceId}:api-key`)
            .pipe(Effect.orElseSucceed(() => Option.none()));
          if (Option.isSome(secret)) {
            credential = textDecoder.decode(secret.value);
          }
        }

        const result = yield* catalogService
          .fetchCatalog({
            serviceId: payload.serviceId,
            ...(baseUrl ? { baseUrl } : {}),
            ...(credential ? { credential } : {}),
          })
          .pipe(
            Effect.catch(() =>
              Effect.succeed<ProviderModelCatalogResponse>({ models: [] }),
            ),
          );

        return result;
      }),
    );
  }),
);
