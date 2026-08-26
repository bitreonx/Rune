import { useState } from "react";
import {
  type ModelServiceConfig,
  type ModelServiceKind,
  MODEL_SERVICE_KINDS,
  ServiceId,
} from "@rune/contracts";
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

const SERVICE_KIND_LABELS: Record<ModelServiceKind, string> = {
  native: "Native Subscription / Account",
  openrouter: "OpenRouter",
  anthropic: "Anthropic API",
  openai: "OpenAI API",
  google: "Google Gemini API",
  "custom-openai-compatible": "Custom OpenAI-compatible Gateway",
  "custom-anthropic-compatible": "Custom Anthropic-compatible Gateway",
};

const DEFAULT_BASE_URLS: Partial<Record<ModelServiceKind, string>> = {
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
};

export function AddServiceDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (service: ModelServiceConfig, apiKey?: string) => void;
  editingService?: ModelServiceConfig | null;
}) {
  const [kind, setKind] = useState<ModelServiceKind>(
    props.editingService?.kind ?? "openrouter",
  );
  const [displayName, setDisplayName] = useState(
    props.editingService?.displayName ?? "OpenRouter",
  );
  const [baseUrl, setBaseUrl] = useState(
    props.editingService?.baseUrl ?? DEFAULT_BASE_URLS[kind] ?? "",
  );
  const [apiKey, setApiKey] = useState("");
  const [customId, setCustomId] = useState(
    props.editingService?.serviceId ?? "",
  );

  const handleKindChange = (newKind: ModelServiceKind) => {
    setKind(newKind);
    if (!props.editingService) {
      setDisplayName(SERVICE_KIND_LABELS[newKind]);
      setBaseUrl(DEFAULT_BASE_URLS[newKind] ?? "");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const serviceIdSlug =
      customId.trim() ||
      props.editingService?.serviceId ||
      `${kind}_${Date.now().toString(36)}`;
    const serviceId = ServiceId.make(serviceIdSlug.toLowerCase().replace(/[^a-z0-9_-]/g, "_"));

    const serviceConfig: ModelServiceConfig = {
      serviceId,
      kind,
      displayName: displayName.trim() || SERVICE_KIND_LABELS[kind],
      ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
      ...(apiKey.trim()
        ? { credentialRef: `model-service:${serviceId}:api-key` }
        : props.editingService?.credentialRef
          ? { credentialRef: props.editingService.credentialRef }
          : {}),
      hasCredential: Boolean(apiKey.trim() || props.editingService?.hasCredential),
    };

    props.onSave(serviceConfig, apiKey.trim() || undefined);
    props.onOpenChange(false);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPopup className="sm:max-w-[500px]">
        <DialogPanel>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {props.editingService ? "Edit Model Service" : "Connect Model Service"}
              </DialogTitle>
              <DialogDescription>
                Connect an LLM service or gateway once to reuse its models and credentials across any profile.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="service-kind">Service Type</Label>
                <select
                  id="service-kind"
                  value={kind}
                  onChange={(e) => handleKindChange(e.target.value as ModelServiceKind)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                  disabled={Boolean(props.editingService)}
                >
                  {MODEL_SERVICE_KINDS.filter((k) => k !== "native").map((k) => (
                    <option key={k} value={k}>
                      {SERVICE_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="display-name">Display Name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. OpenRouter Personal"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="base-url">API Base URL</Label>
                <Input
                  id="base-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="api-key">
                  API Key {props.editingService?.hasCredential && "(leave blank to keep stored key)"}
                </Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    props.editingService?.hasCredential
                      ? "••••••••••••••••"
                      : "Enter API key"
                  }
                  required={!props.editingService?.hasCredential}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => props.onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {props.editingService ? "Save Changes" : "Connect Service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
