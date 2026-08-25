import { createFileRoute } from "@tanstack/react-router";

import { ModelSettingsPanel } from "../components/settings/ModelSettingsPanel";

function SettingsModelsRoute() {
  return <ModelSettingsPanel />;
}

export const Route = createFileRoute("/settings/models")({
  component: SettingsModelsRoute,
});

