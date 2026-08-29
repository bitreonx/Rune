import {
  ProviderDriverKind,
  ProviderInstanceId,
  type ModelServiceKind,
  type ServiceConnectionProtocol,
  type HarnessModelRoutePlan,
  type HarnessModelRouteProtocolFamily,
  type HarnessModelRouteUnsupported,
} from "@rune/contracts";

export interface HarnessModelRoutePlannerInput {
  readonly harness: ProviderDriverKind | string;
  readonly instanceId: ProviderInstanceId | string;
  readonly connection?: {
    readonly connectionId: string;
    readonly kind: ModelServiceKind;
    readonly protocol?: ServiceConnectionProtocol;
  };
  readonly requestedModel: string;
  readonly modelProtocol?: HarnessModelRouteProtocolFamily;
  /** Whether the RUNE-managed translation runtime is installed and healthy. */
  readonly bridgeAvailable?: boolean;
}

export type HarnessModelRoutePlannerResult =
  | { readonly tag: "planned"; readonly plan: HarnessModelRoutePlan }
  | HarnessModelRouteUnsupported;

const protocolFamilyForService = (
  harness: string,
  kind: ModelServiceKind,
  protocol: ServiceConnectionProtocol | undefined,
  modelProtocol: HarnessModelRouteProtocolFamily | undefined,
): HarnessModelRouteProtocolFamily => {
  if (modelProtocol !== undefined && modelProtocol !== "native") return modelProtocol;
  if (protocol === "anthropic-compatible") return "anthropic-messages";
  if (protocol === "openai-responses") return "openai-responses";
  if (protocol === "openai-chat") return "openai-compatible";
  if (protocol === "provider-native") return "native";
  if (kind === "openrouter") return harness === "claudeAgent" ? "anthropic-messages" : "openai-responses";
  if (kind === "anthropic" || kind === "custom-anthropic-compatible") return "anthropic-messages";
  if (kind === "custom-openai-compatible") return "openai-compatible";
  if (kind === "openai") return "openai-responses";
  return "native";
};

const capabilitiesFor = (
  protocolFamily: HarnessModelRouteProtocolFamily,
): HarnessModelRoutePlan["capabilities"] => {
  switch (protocolFamily) {
    case "anthropic-messages":
      return {
        streaming: true,
        tools: true,
        images: true,
        usage: true,
        reasoningEffort: true,
      };
    case "openai-responses":
      return {
        streaming: true,
        tools: true,
        images: true,
        usage: true,
        reasoningEffort: true,
      };
    case "openai-compatible":
      return {
        streaming: true,
        tools: true,
        images: false,
        usage: true,
        reasoningEffort: false,
      };
    case "native":
      return {
        streaming: true,
        tools: true,
        images: true,
        usage: true,
        reasoningEffort: true,
      };
  }
};

const planned = (
  input: HarnessModelRoutePlannerInput,
  routeKind: HarnessModelRoutePlan["routeKind"],
  protocolFamily: HarnessModelRouteProtocolFamily,
): HarnessModelRoutePlannerResult => {
  const hasExternalConnection = input.connection !== undefined && input.connection.kind !== "native";
  const connectionId = hasExternalConnection ? input.connection?.connectionId : undefined;
  return {
    tag: "planned",
    plan: {
    harness: ProviderDriverKind.make(String(input.harness)),
    instanceId: ProviderInstanceId.make(String(input.instanceId)),
    ...(connectionId === undefined ? {} : { connectionId }),
    requestedModel: input.requestedModel.trim(),
    routeKind,
    protocolFamily,
    bridgeRequired: routeKind === "rune-bridge",
    subagentModelPolicy: hasExternalConnection ? "inherit" : "native-default",
    capabilities: capabilitiesFor(protocolFamily),
    },
  };
};

const unsupported = (reason: string): HarnessModelRouteUnsupported => ({
  tag: "unsupported",
  reason,
});

/**
 * Compile one explicit harness + connection + model selection. The planner is
 * intentionally conservative: it never changes the requested model or
 * silently falls back to a different connection.
 */
export const planHarnessModelRoute = (
  input: HarnessModelRoutePlannerInput,
): HarnessModelRoutePlannerResult => {
  const requestedModel = input.requestedModel.trim();
  if (requestedModel.length === 0) return unsupported("Choose a model before starting this route.");

  if (input.connection === undefined || input.connection.kind === "native") {
    return planned({ ...input, requestedModel }, "native", "native");
  }

  const harness = String(input.harness);
  const protocolFamily = protocolFamilyForService(
    harness,
    input.connection.kind,
    input.connection.protocol,
    input.modelProtocol,
  );

  if (harness === "runeNative") {
    return planned(input, "native", protocolFamily);
  }

  if (harness === "claudeAgent" && protocolFamily === "anthropic-messages") {
    return planned(input, "service-compatible", protocolFamily);
  }

  if (
    harness === "codex" &&
    (protocolFamily === "openai-responses" || protocolFamily === "openai-compatible")
  ) {
    return planned(input, "service-compatible", protocolFamily);
  }

  if (input.bridgeAvailable === true && harness === "claudeAgent") {
    return planned(input, "rune-bridge", protocolFamily);
  }

  return unsupported(
    `${harness} cannot use ${protocolFamily} through ${input.connection.kind} without a validated bridge.`,
  );
};

export const HarnessModelRoutePlanner = { plan: planHarnessModelRoute } as const;
