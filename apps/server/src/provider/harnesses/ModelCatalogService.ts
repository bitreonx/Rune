/**
 * ModelCatalogService — fetch and parse model catalogs from OpenRouter, OpenAI, and compatible gateways.
 *
 * Tolerant parser: accepts OpenAI shape `{ data: [{ id }] }`, Anthropic shape `{ data: [{ id, name }] }`,
 * or bare arrays. Caps results to 500, deduplicates, and caches responses for 5 minutes.
 *
 * @module provider/harnesses/ModelCatalogService
 */
import {
  type ProviderModelCatalogEntry,
  type ProviderModelCatalogResponse,
} from "@rune/contracts";
import * as Cache from "effect/Cache";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";

const CATALOG_CACHE_TTL = Duration.minutes(5);
const MAX_CATALOG_MODELS = 500;
const CATALOG_REQUEST_TIMEOUT = Duration.seconds(10);

export function parseModelCatalogResponse(
  body: unknown,
): ReadonlyArray<ProviderModelCatalogEntry> {
  if (!body || typeof body !== "object") {
    return [];
  }

  let rawList: unknown[] = [];
  if (Array.isArray(body)) {
    rawList = body;
  } else if ("data" in body && Array.isArray((body as { data: unknown }).data)) {
    rawList = (body as { data: unknown[] }).data;
  } else if (
    "models" in body &&
    Array.isArray((body as { models: unknown }).models)
  ) {
    rawList = (body as { models: unknown[] }).models;
  }

  const results: ProviderModelCatalogEntry[] = [];
  const seenIds = new Set<string>();

  for (const item of rawList) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);

    const name =
      typeof record.name === "string" && record.name.trim().length > 0
        ? record.name.trim()
        : typeof record.display_name === "string" &&
            record.display_name.trim().length > 0
          ? record.display_name.trim()
          : undefined;

    const contextLength =
      typeof record.context_length === "number" &&
      Number.isFinite(record.context_length)
        ? record.context_length
        : typeof record.context_window === "number" &&
            Number.isFinite(record.context_window)
          ? record.context_window
          : undefined;

    results.push({
      id,
      ...(name ? { name } : {}),
      ...(contextLength !== undefined ? { contextLength } : {}),
    });

    if (results.length >= MAX_CATALOG_MODELS) {
      break;
    }
  }

  return results;
}

export function resolveCatalogEndpointUrl(baseUrl?: string): string {
  if (!baseUrl || baseUrl.trim().length === 0) {
    return "https://openrouter.ai/api/v1/models";
  }

  let cleaned = baseUrl.trim().replace(/\/+$/, "");
  if (cleaned.endsWith("/models")) {
    return cleaned;
  }
  return `${cleaned}/models`;
}

export class ModelCatalogService extends Context.Service<
  ModelCatalogService,
  {
    fetchCatalog(input: {
      readonly serviceId: string;
      readonly baseUrl?: string;
      readonly credential?: string;
    }): Effect.Effect<ProviderModelCatalogResponse, Error>;
  }
>()("@rune/server/provider/harnesses/ModelCatalogService") {}

const make = Effect.gen(function* () {
  const httpClient = yield* HttpClient.HttpClient;

  const catalogCache = yield* Cache.make<
    string,
    ReadonlyArray<ProviderModelCatalogEntry>,
    Error
  >({
    capacity: 100,
    timeToLive: CATALOG_CACHE_TTL,
    lookup: (cacheKey) =>
      Effect.gen(function* () {
        const [rawTargetUrl, credential = ""] = cacheKey.split("|||", 2);
        const targetUrl = rawTargetUrl || "https://openrouter.ai/api/v1/models";

        const headers: Record<string, string> = {
          Accept: "application/json",
          "HTTP-Referer": "https://rune.dev",
          "X-Title": "RUNE",
        };

        if (credential) {
          headers["Authorization"] = `Bearer ${credential}`;
        }

        const response = yield* httpClient
          .get(targetUrl, {
            headers,
          })
          .pipe(
            Effect.flatMap(HttpClientResponse.filterStatusOk),
            Effect.flatMap((res) => res.json),
            Effect.timeout(CATALOG_REQUEST_TIMEOUT),
            Effect.mapError(
              (cause) =>
                new Error(
                  `Failed to fetch model catalog from ${targetUrl}: ${String(cause)}`,
                ),
            ),
          );

        return parseModelCatalogResponse(response);
      }),
  });

  const fetchCatalog = (input: {
    readonly serviceId: string;
    readonly baseUrl?: string;
    readonly credential?: string;
  }) =>
    Effect.gen(function* () {
      const url = resolveCatalogEndpointUrl(input.baseUrl);
      const cacheKey = `${url}|||${input.credential ?? ""}`;
      const models = yield* Cache.get(catalogCache, cacheKey);
      return { models };
    });

  return {
    fetchCatalog,
  } satisfies ModelCatalogService["Service"];
});

export const layer = Layer.effect(ModelCatalogService, make);
