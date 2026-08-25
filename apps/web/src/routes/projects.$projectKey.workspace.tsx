import { createFileRoute, redirect } from "@tanstack/react-router";

import { RuneProjectWorkspace } from "../components/RuneProjectWorkspace";

export const Route = createFileRoute("/projects/$projectKey/workspace")({
  beforeLoad: async ({ context }) => {
    if (
      context.authGateState.status !== "authenticated" &&
      context.authGateState.status !== "hosted-static"
    ) {
      throw redirect({ to: "/pair", replace: true });
    }
  },
  component: () => <RuneProjectWorkspace projectKey={Route.useParams().projectKey} />,
});
