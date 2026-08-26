import type { ApiModelCapabilities, ProviderDriverKind } from "@rune/contracts";

export type { ApiModelCapabilities, ApiReasoningMode } from "@rune/contracts";

export interface ApiCapabilityInput {
  readonly driver: ProviderDriverKind;
  readonly advertised?: Partial<ApiModelCapabilities> | undefined;
}

const CONSERVATIVE_CAPABILITIES: ApiModelCapabilities = {
  parallelToolCalls: false,
  strictToolSchemas: false,
  reasoningMode: "none",
  reportsCachedTokens: false,
  supportsFim: false,
};

export function resolveApiModelCapabilities(input: ApiCapabilityInput): ApiModelCapabilities {
  return {
    ...CONSERVATIVE_CAPABILITIES,
    ...input.advertised,
  };
}

interface ApiRequestTool {
  readonly type: "function";
  readonly function: Record<string, unknown>;
}

export interface ApiRequestBodyInput {
  readonly model: string;
  readonly systemPrompt: string;
  readonly messages: ReadonlyArray<Record<string, unknown>>;
  readonly tools: ReadonlyArray<ApiRequestTool>;
  readonly capabilities: ApiModelCapabilities;
}

export function buildApiRequestBody(input: ApiRequestBodyInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: input.model,
    messages: [{ role: "system", content: input.systemPrompt }, ...input.messages],
    stream: true,
    stream_options: { include_usage: true },
  };
  if (input.tools.length > 0) {
    body.tools = input.tools.map((tool) =>
      input.capabilities.strictToolSchemas
        ? { ...tool, function: { ...tool.function, strict: true } }
        : tool,
    );
    body.tool_choice = "auto";
  }
  if (input.capabilities.parallelToolCalls) body.parallel_tool_calls = true;
  if (input.capabilities.reasoningMode !== "none") {
    body.thinking = { type: "enabled" } satisfies { type: "enabled" | "disabled" };
  }
  return body;
}
