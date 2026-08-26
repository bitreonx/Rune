"use client";

import { useClaudeServiceSetupRequest, closeClaudeServiceSetup } from "../../claudeServiceSetupBus";
import { useEnvironmentSettings, useUpdateEnvironmentSettings } from "../../hooks/useSettings";
import { AddHarnessDialog } from "./AddHarnessDialog";

/**
 * Mounts the universal "Add provider" wizard at app scope.
 */
export function ClaudeServiceDialogHost() {
  const request = useClaudeServiceSetupRequest();
  const environmentId = request?.environmentId;
  const settings = useEnvironmentSettings(environmentId ?? ("primary" as any));
  const updateSettings = useUpdateEnvironmentSettings(environmentId ?? ("primary" as any));

  if (request === null || !environmentId) return null;

  return (
    <AddHarnessDialog
      open={true}
      settings={settings}
      onOpenChange={(open) => {
        if (!open) closeClaudeServiceSetup();
      }}
      onSaveProfile={(profile) => {
        const nextProfiles = {
          ...(settings.harnesses?.profiles ?? {}),
          [profile.profileId]: profile,
        };

        const isClaude = profile.harnessKind === "claudeAgent";
        const envVars: any[] = [];
        if (profile.route.modelServiceId !== "native") {
          const service = settings.harnesses?.services?.[profile.route.modelServiceId as any];
          if (service?.kind === "openrouter" || String(profile.route.modelServiceId) === "openrouter") {
            if (isClaude) {
              envVars.push({ name: "ANTHROPIC_BASE_URL", value: "https://openrouter.ai/api" });
            } else {
              envVars.push({ name: "OPENAI_BASE_URL", value: "https://openrouter.ai/api/v1" });
            }
          }
        }

        const nextInstances = {
          ...(settings.providerInstances ?? {}),
          [profile.instanceId]: {
            driver: profile.harnessKind,
            displayName: profile.displayName,
            accentColor: profile.accentColor,
            enabled: true,
            environment: envVars,
            customModels: [profile.route.defaultModel],
          },
        };

        updateSettings({
          harnesses: {
            profiles: nextProfiles,
            services: settings.harnesses?.services ?? {},
          },
          providerInstances: nextInstances,
          ...(request.origin === "composer"
            ? {
                textGenerationModelSelection: {
                  instanceId: profile.instanceId,
                  model: profile.route.defaultModel,
                },
              }
            : {}),
        });

        closeClaudeServiceSetup();
      }}
    />
  );
}

