import { createFileRoute } from "@tanstack/react-router";

import { EnvironmentId, ProviderInstanceId } from "@rune/contracts";

import { ProviderInstanceEditPage } from "../components/settings/ProviderInstanceEditPage";
import { usePrimaryEnvironmentId } from "../state/environments";

type ProviderInstanceSearch = { readonly env: string | undefined };

function SettingsProviderInstanceRoute() {
  const params = Route.useParams();
  const search = Route.useSearch();
  const primaryEnvironmentId = usePrimaryEnvironmentId();

  // The list page links here with the device it rendered from; a direct visit
  // falls back to the primary device once the catalog hydrates.
  const environmentId =
    search.env !== undefined && search.env.trim().length > 0
      ? EnvironmentId.make(search.env)
      : primaryEnvironmentId;

  if (environmentId === null) {
    return null;
  }
  return (
    <ProviderInstanceEditPage
      instanceId={ProviderInstanceId.make(params.instanceId)}
      environmentId={environmentId}
    />
  );
}

export const Route = createFileRoute("/settings/providers/$instanceId")({
  component: SettingsProviderInstanceRoute,
  validateSearch: (raw: Record<string, unknown>): ProviderInstanceSearch => ({
    env: typeof raw.env === "string" ? raw.env.slice(0, 200) : undefined,
  }),
});
