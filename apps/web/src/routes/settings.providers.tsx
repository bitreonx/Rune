import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";

import { ProviderSettingsPanel } from "../components/settings/ProviderSettingsPanel";
import { ClaudeServiceDialogHost } from "../components/settings/ClaudeServiceDialogHost";

function SettingsProvidersRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isInstanceRoute = /^\/settings\/providers\/[^/]+$/.test(pathname);

  return (
    <>
      {!isInstanceRoute && <ProviderSettingsPanel />}
      <ClaudeServiceDialogHost />
      <Outlet />
    </>
  );
}

export const Route = createFileRoute("/settings/providers")({
  component: SettingsProvidersRoute,
});
