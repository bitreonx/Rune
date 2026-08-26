import type { ModelMetadata, ServerProviderModel } from "@rune/contracts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readPositiveInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : undefined;
}

function readStringArray(value: unknown): ReadonlyArray<string> | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.flatMap((entry) => {
    const parsed = readString(entry);
    return parsed === undefined ? [] : [parsed];
  });
  return values.length > 0 ? values : undefined;
}

function readPricing(value: unknown): ModelMetadata["pricing"] {
  if (!isRecord(value)) return undefined;
  const prompt = readString(value.prompt);
  const completion = readString(value.completion);
  const inputCacheRead = readString(value.input_cache_read);
  const inputCacheWrite = readString(value.input_cache_write);
  if (
    prompt === undefined &&
    completion === undefined &&
    inputCacheRead === undefined &&
    inputCacheWrite === undefined
  ) {
    return undefined;
  }
  return {
    ...(prompt === undefined ? {} : { prompt }),
    ...(completion === undefined ? {} : { completion }),
    ...(inputCacheRead === undefined ? {} : { inputCacheRead }),
    ...(inputCacheWrite === undefined ? {} : { inputCacheWrite }),
  };
}

function readReasoning(value: unknown): ModelMetadata["reasoning"] {
  if (!isRecord(value)) return undefined;
  const mandatory = typeof value.mandatory === "boolean" ? value.mandatory : undefined;
  const defaultEffort = readString(value.default_effort);
  const supportedEfforts = readStringArray(value.supported_efforts);
  if (mandatory === undefined && defaultEffort === undefined && supportedEfforts === undefined) {
    return undefined;
  }
  return {
    ...(mandatory === undefined ? {} : { mandatory }),
    ...(defaultEffort === undefined ? {} : { defaultEffort }),
    ...(supportedEfforts === undefined ? {} : { supportedEfforts }),
  };
}

function readMetadata(entry: Record<string, unknown>): ModelMetadata | undefined {
  const architecture = isRecord(entry.architecture) ? entry.architecture : undefined;
  const topProvider = isRecord(entry.top_provider) ? entry.top_provider : undefined;
  const metadata: ModelMetadata = {
    ...(readString(entry.canonical_slug) === undefined
      ? {}
      : { canonicalSlug: readString(entry.canonical_slug) }),
    ...(readPositiveInt(entry.context_length) === undefined
      ? {}
      : { contextWindow: readPositiveInt(entry.context_length) }),
    ...(readPositiveInt(topProvider?.max_completion_tokens) === undefined
      ? {}
      : { maxOutputTokens: readPositiveInt(topProvider?.max_completion_tokens) }),
    ...(readStringArray(architecture?.input_modalities) === undefined
      ? {}
      : { inputModalities: readStringArray(architecture?.input_modalities) }),
    ...(readStringArray(architecture?.output_modalities) === undefined
      ? {}
      : { outputModalities: readStringArray(architecture?.output_modalities) }),
    ...(readStringArray(entry.supported_parameters) === undefined
      ? {}
      : { supportedParameters: readStringArray(entry.supported_parameters) }),
    ...(readPricing(entry.pricing) === undefined ? {} : { pricing: readPricing(entry.pricing) }),
    ...(readReasoning(entry.reasoning) === undefined
      ? {}
      : { reasoning: readReasoning(entry.reasoning) }),
  };
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/** Normalize OpenRouter's catalog into Rune's provider-neutral model shape. */
export function parseOpenRouterModelCatalog(payload: unknown): ReadonlyArray<ServerProviderModel> {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return [];
  return payload.data.flatMap((entry): ReadonlyArray<ServerProviderModel> => {
    if (!isRecord(entry)) return [];
    const slug = readString(entry.id);
    if (slug === undefined) return [];
    const name = readString(entry.name) ?? slug;
    const metadata = readMetadata(entry);
    return [
      {
        slug,
        name,
        isCustom: false,
        capabilities: null,
        ...(metadata === undefined ? {} : { metadata }),
      },
    ];
  });
}
