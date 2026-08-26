import { useState } from "react";
import {
  type ModelServiceConfig,
  type ServerSettings,
  ServiceId,
} from "@rune/contracts";
import {
  GlobeIcon,
  PlusIcon,
  ChevronRightIcon,
  LayersIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { AddServiceDialog } from "./AddServiceDialog";
import { cn } from "../../lib/utils";

export function ModelServicesSection(props: {
  settings: ServerSettings;
  onUpdateSettings: (patch: Partial<ServerSettings>) => void;
  onSaveServiceSecret?: (serviceId: string, apiKey: string) => void;
  readOnly?: boolean;
}) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ModelServiceConfig | null>(null);

  const services = Object.values(props.settings.harnesses?.services ?? {});
  const profiles = Object.values(props.settings.harnesses?.profiles ?? {});

  const handleSaveService = (service: ModelServiceConfig, apiKey?: string) => {
    const nextServices = {
      ...(props.settings.harnesses?.services ?? {}),
      [service.serviceId]: service,
    };

    props.onUpdateSettings({
      harnesses: {
        profiles: props.settings.harnesses?.profiles ?? {},
        services: nextServices,
      },
    });

    if (apiKey && props.onSaveServiceSecret) {
      props.onSaveServiceSecret(service.serviceId, apiKey);
    }
  };

  const getProfilesUsingService = (serviceId: ServiceId) => {
    return profiles.filter((p) => p.route?.modelServiceId === serviceId);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">API Providers</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect model APIs for RUNE Native and for harness instances that support external model routing.
          </p>
        </div>
        {!props.readOnly ? (
          <Button
            size="sm"
            onClick={() => {
              setEditingService(null);
              setAddDialogOpen(true);
            }}
            className="gap-1.5 h-8 text-xs font-medium"
          >
            <PlusIcon className="size-3.5" />
            Add provider
          </Button>
        ) : null}
      </div>

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 py-6 px-4 text-center">
          <GlobeIcon className="size-6 text-muted-foreground/60 mb-2" />
          <p className="text-xs text-muted-foreground max-w-sm mb-3">
            Connect OpenRouter or another API provider to power RUNE Native or compatible coding harnesses.
          </p>
          {!props.readOnly ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingService(null);
                setAddDialogOpen(true);
              }}
              className="h-7 text-xs gap-1.5"
            >
              <PlusIcon className="size-3" />
              Add provider
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {services.map((service) => {
            const usingProfiles = getProfilesUsingService(service.serviceId);
            const isConnected = Boolean(service.hasCredential || service.status === "connected");

            return (
              <button
                key={service.serviceId}
                type="button"
                onClick={() => {
                  setEditingService(service);
                  setAddDialogOpen(true);
                }}
                className={cn(
                  "group flex items-center justify-between rounded-xl border border-border/60 bg-card p-3.5 text-left transition-all",
                  "hover:border-border hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring",
                )}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-foreground ring-1 ring-border/50 transition-colors group-hover:bg-muted">
                    <GlobeIcon className="size-5 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm leading-tight text-foreground truncate">
                        {service.displayName}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {usingProfiles.length > 0
                        ? `Used by ${usingProfiles.length} harness instance${usingProfiles.length === 1 ? "" : "s"}`
                        : "Ready to route"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      isConnected
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        isConnected ? "bg-emerald-500" : "bg-amber-500",
                      )}
                    />
                    {isConnected ? "Connected" : "Needs key"}
                  </span>
                  <ChevronRightIcon className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <AddServiceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        editingService={editingService}
        onSave={handleSaveService}
      />
    </div>
  );
}
