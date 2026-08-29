/**
 * Health data for a RUNE-managed model bridge.
 *
 * This module deliberately knows nothing about a particular translator. A
 * bridge is considered usable only when its health endpoint proves the
 * protocol capabilities required by the route. The supervisor therefore
 * fails closed when a sidecar is absent, unhealthy, or reports incomplete
 * capabilities.
 */

export const MODEL_BRIDGE_PROTOCOLS = [
  "anthropic-messages",
  "openai-responses",
  "openai-compatible",
] as const;

export type ModelBridgeProtocol = (typeof MODEL_BRIDGE_PROTOCOLS)[number];

export interface ModelBridgeHealthCapabilities {
  readonly streaming: boolean;
  readonly tools: boolean;
  readonly usage: boolean;
  readonly images: boolean;
  readonly reasoningEffort: boolean;
  readonly protocols: ReadonlyArray<ModelBridgeProtocol>;
}

export interface ModelBridgeHealthResponse {
  readonly status: "ready";
  readonly version?: string;
  readonly capabilities: ModelBridgeHealthCapabilities;
}

export interface ModelBridgeHealthFailure {
  readonly status: "invalid";
  readonly reason: string;
}

export type ParsedModelBridgeHealth = ModelBridgeHealthResponse | ModelBridgeHealthFailure;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

const isProtocol = (value: unknown): value is ModelBridgeProtocol =>
  typeof value === "string" &&
  (MODEL_BRIDGE_PROTOCOLS as ReadonlyArray<string>).includes(value);

const readRequiredBoolean = (value: Record<string, unknown>, key: string): boolean | undefined =>
  isBoolean(value[key]) ? value[key] : undefined;

/**
 * Parse a sidecar health payload without preserving arbitrary response data.
 * This prevents bridge-specific secrets or diagnostic fields from crossing
 * into the runtime status model.
 */
export const parseModelBridgeHealth = (value: unknown): ParsedModelBridgeHealth => {
  if (!isRecord(value) || value.status !== "ready" || !isRecord(value.capabilities)) {
    return { status: "invalid", reason: "Bridge health did not report a ready status." };
  }

  const streaming = readRequiredBoolean(value.capabilities, "streaming");
  const tools = readRequiredBoolean(value.capabilities, "tools");
  const usage = readRequiredBoolean(value.capabilities, "usage");
  const images = readRequiredBoolean(value.capabilities, "images");
  const reasoningEffort = readRequiredBoolean(value.capabilities, "reasoningEffort");
  const protocols = value.capabilities.protocols;
  if (
    streaming === undefined ||
    tools === undefined ||
    usage === undefined ||
    images === undefined ||
    reasoningEffort === undefined ||
    !Array.isArray(protocols) ||
    !protocols.every(isProtocol)
  ) {
    return { status: "invalid", reason: "Bridge health capabilities are incomplete." };
  }

  return {
    status: "ready",
    ...(typeof value.version === "string" && value.version.trim().length > 0
      ? { version: value.version.trim() }
      : {}),
    capabilities: {
      streaming,
      tools,
      usage,
      images,
      reasoningEffort,
      protocols: [...protocols],
    },
  };
};

export const bridgeSupportsRoute = (
  health: ModelBridgeHealthResponse,
  protocol: string,
  required: Pick<ModelBridgeHealthCapabilities, "streaming" | "tools" | "usage">,
): boolean =>
  health.capabilities.protocols.includes(protocol as ModelBridgeProtocol) &&
  health.capabilities.streaming === required.streaming &&
  health.capabilities.tools === required.tools &&
  health.capabilities.usage === required.usage;

