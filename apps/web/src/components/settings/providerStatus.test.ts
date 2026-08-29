import { describe, expect, it } from "vite-plus/test";
import {
  ProviderDriverKind,
  ProviderInstanceId,
  ServiceId,
  type ProviderInstanceConfig,
  type ServerProvider,
} from "@rune/contracts";

import { resolveInstanceReadiness } from "./providerStatus";

const instance = (patch: Partial<ProviderInstanceConfig> = {}): ProviderInstanceConfig => ({
  driver: ProviderDriverKind.make("claudeAgent"),
  enabled: true,
  ...patch,
});

const provider = (patch: Partial<ServerProvider> = {}): ServerProvider => ({
  instanceId: ProviderInstanceId.make("claude_work"),
  driver: ProviderDriverKind.make("claudeAgent"),
  enabled: true,
  installed: true,
  version: null,
  status: "ready",
  auth: { status: "unauthenticated" },
  checkedAt: "2026-08-29T00:00:00.000Z",
  models: [],
  slashCommands: [],
  skills: [],
  ...patch,
});

const serviceId = ServiceId.make("openrouter_work");

describe("resolveInstanceReadiness", () => {
  it("uses the external connection instead of native harness auth", () => {
    expect(
      resolveInstanceReadiness({
        instance: instance({ connectionId: serviceId }),
        provider: provider(),
        services: {
          [serviceId]: {
            serviceId,
            kind: "openrouter",
            displayName: "OpenRouter Work",
            status: "connected",
            hasCredential: true,
          },
        },
      }),
    ).toEqual({ tag: "ready", connectionLabel: "OpenRouter Work" });
  });

  it("uses explicit external routing metadata instead of native auth", () => {
    expect(
      resolveInstanceReadiness({
        instance: instance({
          serviceKind: "openrouter",
          authMode: "rune-managed",
        }),
        provider: provider(),
      }),
    ).toEqual({ tag: "ready", connectionLabel: "OpenRouter" });
  });

  it("does not turn a legacy OpenRouter environment route into native sign-in", () => {
    expect(
      resolveInstanceReadiness({
        instance: instance({
          environment: [
            {
              name: "ANTHROPIC_BASE_URL",
              value: "https://openrouter.ai/api",
              sensitive: false,
            },
            {
              name: "ANTHROPIC_AUTH_TOKEN",
              value: "",
              valueRedacted: true,
              sensitive: true,
            },
          ],
        }),
        provider: provider(),
      }),
    ).toEqual({ tag: "ready", connectionLabel: "OpenRouter" });
  });

  it("targets the connection when the external service needs auth", () => {
    expect(
      resolveInstanceReadiness({
        instance: instance({ connectionId: serviceId }),
        provider: provider(),
        services: {
          [serviceId]: {
            serviceId,
            kind: "openrouter",
            displayName: "OpenRouter Work",
            status: "needs-auth",
          },
        },
      }),
    ).toEqual({
      tag: "sign-in-required",
      target: "connection",
      action: "Connect OpenRouter Work",
    });
  });

  it("targets the harness for native unauthenticated instances", () => {
    expect(
      resolveInstanceReadiness({
        instance: instance(),
        provider: provider(),
      }),
    ).toEqual({
      tag: "sign-in-required",
      target: "harness",
      action: "Sign in to this harness",
    });
  });

  it("keeps disabled and broken connections actionable without guessing auth", () => {
    expect(
      resolveInstanceReadiness({
        instance: instance({ enabled: false, connectionId: serviceId }),
        services: {},
      }),
    ).toEqual({ tag: "disabled" });

    expect(
      resolveInstanceReadiness({
        instance: instance({ connectionId: serviceId }),
        provider: provider(),
        services: {},
      }),
    ).toEqual({
      tag: "needs-attention",
      reason: "The selected model service is missing.",
      recovery: "Open Model Services and reconnect this instance to an available service.",
    });
  });

  it("preserves a configured fallback while model discovery is pending", () => {
    expect(
      resolveInstanceReadiness({
        instance: instance({
          connectionId: serviceId,
          modelBindings: { main: "openai/gpt-5" },
        }),
        services: {
          [serviceId]: {
            serviceId,
            kind: "openrouter",
            displayName: "OpenRouter Work",
            status: "checking",
          },
        },
      }),
    ).toEqual({ tag: "discovering-models", fallbackModel: "openai/gpt-5" });
  });
});
