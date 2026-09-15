import { useEffect, useState } from "react";
import {
  BUILT_IN_HARNESS_DEFINITIONS,
  type HarnessDefinition,
  type HarnessProfileConfig,
  type ModelRoute,
  ProfileId,
  ProviderInstanceId,
  type ServerSettings,
  ServiceId,
} from "@rune/contracts";
import {
  ChevronLeftIcon,
  SparklesIcon,
  GlobeIcon,
  CheckIcon,
  PlusIcon,
  FolderIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { getProviderBrandPresentation } from "../chat/providerIconUtils";

export function AddHarnessDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ServerSettings;
  initialHarnessKind?: string | undefined;
  onSaveProfile: (profile: HarnessProfileConfig) => void;
  onOpenConnectService?: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedHarness, setSelectedHarness] = useState<HarnessDefinition>(
    BUILT_IN_HARNESS_DEFINITIONS[0]!,
  );

  // Step 2 state
  const [displayName, setDisplayName] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [shadowHome, setShadowHome] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("native");
  const [defaultModel, setDefaultModel] = useState("claude-3-7-sonnet-20250219");
  const [sameEverywhere, setSameEverywhere] = useState(true);
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>({});
  const [showRoleDetails, setShowRoleDetails] = useState(false);

  const connectedServices = Object.values(props.settings.harnesses?.services ?? {});

  useEffect(() => {
    if (props.open && props.initialHarnessKind) {
      const match = BUILT_IN_HARNESS_DEFINITIONS.find((d) => d.kind === props.initialHarnessKind);
      if (match) {
        setSelectedHarness(match);
        setDisplayName(`${match.displayName} Account`);
        if (match.kind === "codex") {
          setDefaultModel("gpt-4o");
          setShadowHome(`~/.codex-rune/${Date.now().toString(36)}`);
        } else if (match.kind === "claudeAgent") {
          setDefaultModel("claude-3-7-sonnet-20250219");
        } else {
          setDefaultModel("default");
        }
        setStep(2);
      }
    }
  }, [props.open, props.initialHarnessKind]);

  const handleSelectHarness = (harness: HarnessDefinition) => {
    setSelectedHarness(harness);
    setDisplayName(`${harness.displayName} Account`);
    if (harness.kind === "claudeAgent") {
      setDefaultModel("claude-3-7-sonnet-20250219");
    } else if (harness.kind === "codex") {
      setDefaultModel("gpt-4o");
      setShadowHome(`~/.codex-rune/${Date.now().toString(36)}`);
    } else {
      setDefaultModel("default");
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = displayName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, "_");
    const profileId = ProfileId.make(`${selectedHarness.kind}_${Date.now().toString(36)}`);
    const instanceId = ProviderInstanceId.make(`inst_${slug || profileId}`);

    const route: ModelRoute = {
      modelServiceId: selectedServiceId === "native" ? "native" : ServiceId.make(selectedServiceId),
      defaultModel: defaultModel.trim() || "default",
      sameModelEverywhere: sameEverywhere,
      roleOverrides: sameEverywhere ? {} : roleOverrides,
    };

    const identity = shadowHome.trim()
      ? {
          label: displayName.trim() || selectedHarness.displayName,
          managedShadowHome: shadowHome.trim(),
        }
      : undefined;

    const profile: HarnessProfileConfig = {
      profileId,
      harnessKind: selectedHarness.kind,
      displayName: displayName.trim() || `${selectedHarness.displayName} Account`,
      ...(accentColor.trim() ? { accentColor: accentColor.trim() } : {}),
      enabled: true,
      ...(identity ? { identity } : {}),
      instanceId,
      route,
      routeVersion: 1,
    };

    props.onSaveProfile(profile);
    props.onOpenChange(false);
    setStep(1);
  };

  const supportedRoles = selectedHarness.capabilities.roles;

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        props.onOpenChange(open);
        if (!open) setStep(1);
      }}
    >
      <DialogPopup className="sm:max-w-[560px]">
        <DialogPanel>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {step === 2 && !props.initialHarnessKind && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="rounded-full p-1 hover:bg-muted text-muted-foreground"
                    title="Back to harness selection"
                  >
                    <ChevronLeftIcon className="size-4" />
                  </button>
                )}
                {step === 1 ? "Select Agent Harness" : `Configure ${selectedHarness.displayName}`}
              </DialogTitle>
              <DialogDescription>
                {step === 1
                  ? "Choose the coding-agent runtime you want to connect and direct."
                  : "Set up instance identity, multi-account shadow directories, and model routing."}
              </DialogDescription>
            </DialogHeader>

            {step === 1 ? (
              <div className="grid gap-2.5 py-4 max-h-[400px] overflow-y-auto pr-1">
                {BUILT_IN_HARNESS_DEFINITIONS.map((harness) => {
                  const IconComp = getProviderBrandPresentation(String(harness.kind))?.icon;
                  return (
                    <button
                      key={harness.kind}
                      type="button"
                      onClick={() => handleSelectHarness(harness)}
                      className="flex items-center justify-between rounded-xl border bg-card p-3.5 text-left transition-all hover:bg-muted/50 hover:border-border/80 focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground ring-1 ring-border/50">
                          {IconComp ? (
                            <IconComp className="size-5" />
                          ) : (
                            <SparklesIcon className="size-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{harness.displayName}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {harness.tagline}
                          </div>
                        </div>
                      </div>
                      <ChevronLeftIcon className="size-4 rotate-180 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4 py-4 text-sm max-h-[450px] overflow-y-auto pr-1">
                {/* Instance Name & Color */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="displayName">Account / Profile Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Work Account, OpenRouter Gateway"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="accentColor"
                        type="color"
                        value={accentColor || "#10b981"}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="h-9 w-12 cursor-pointer p-1"
                      />
                      <Input
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        placeholder="#10b981"
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Shadow Home (for Codex multi-account) */}
                {selectedHarness.kind === "codex" ? (
                  <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                    <Label htmlFor="shadowHome" className="flex items-center gap-1.5">
                      <FolderIcon className="size-3.5 text-primary" />
                      Isolated Shadow Home (Multi-Account)
                    </Label>
                    <Input
                      id="shadowHome"
                      value={shadowHome}
                      onChange={(e) => setShadowHome(e.target.value)}
                      placeholder="~/.codex-rune/work"
                      className="font-mono text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Isolates auth cookies and session storage so you can run multiple Codex
                      accounts concurrently.
                    </p>
                  </div>
                ) : null}

                {/* Service Route */}
                <div className="space-y-2">
                  <Label>Model Service Route</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedServiceId("native")}
                      className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                        selectedServiceId === "native"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "bg-card hover:bg-muted/50"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium text-xs">Direct / CLI Default</div>
                        <div className="text-[11px] text-muted-foreground">
                          Host CLI credentials
                        </div>
                      </div>
                      {selectedServiceId === "native" ? (
                        <CheckIcon className="size-4 text-primary" />
                      ) : null}
                    </button>

                    {connectedServices.map((svc) => (
                      <button
                        key={svc.serviceId}
                        type="button"
                        onClick={() => setSelectedServiceId(svc.serviceId)}
                        className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                          selectedServiceId === svc.serviceId
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "bg-card hover:bg-muted/50"
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 pr-1">
                          <div className="font-medium text-xs truncate">{svc.displayName}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {svc.kind}
                          </div>
                        </div>
                        {selectedServiceId === svc.serviceId ? (
                          <CheckIcon className="size-4 text-primary shrink-0" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model Routing */}
                <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="defaultModel">Primary / Default Model</Label>
                    <Input
                      id="defaultModel"
                      value={defaultModel}
                      onChange={(e) => setDefaultModel(e.target.value)}
                      placeholder="e.g. anthropic/claude-3.7-sonnet, gpt-4o"
                      className="font-mono text-xs"
                      required
                    />
                  </div>

                  {supportedRoles.length > 1 ? (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Role-Specific Model Overrides</span>
                        <button
                          type="button"
                          onClick={() => setSameEverywhere(!sameEverywhere)}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          {sameEverywhere
                            ? "+ Configure Subagent / Reasoning Models"
                            : "Use Default Everywhere"}
                        </button>
                      </div>

                      {!sameEverywhere ? (
                        <div className="space-y-2 pt-1">
                          {supportedRoles
                            .filter((r) => r.role !== "main")
                            .map((r) => (
                              <div key={r.role} className="flex items-center gap-2">
                                <Label className="w-28 text-xs shrink-0 text-muted-foreground">
                                  {r.label}:
                                </Label>
                                <Input
                                  value={roleOverrides[r.role] || ""}
                                  onChange={(e) =>
                                    setRoleOverrides({
                                      ...roleOverrides,
                                      [r.role]: e.target.value,
                                    })
                                  }
                                  placeholder={defaultModel}
                                  className="h-8 font-mono text-xs"
                                />
                              </div>
                            ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
                Cancel
              </Button>
              {step === 2 ? <Button type="submit">Save Instance</Button> : null}
            </DialogFooter>
          </form>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
