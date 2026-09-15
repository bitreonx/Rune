import { scopeProjectRef } from "@rune/client-runtime/environment";
import { EnvironmentId, ProjectId, type ScopedThreadRef } from "@rune/contracts";

import { gitHubPullRequestBrowserUrl } from "../lib/openPullRequestLink";
import { selectActiveRightPanelSurface, useRightPanelStore } from "../rightPanelStore";
import { useProject } from "../state/entities";
import { pullRequestEnvironment } from "../state/pullRequests";
import { useEnvironmentQuery } from "../state/query";

export function useOpenPanelPullRequestUrl(threadRef: ScopedThreadRef | null) {
  const surface = useRightPanelStore((state) =>
    selectActiveRightPanelSurface(state.byThreadKey, threadRef),
  );
  const reference = surface?.kind === "pull-request" ? surface : null;
  const environmentId = reference?.environmentId
    ? EnvironmentId.make(reference.environmentId)
    : threadRef?.environmentId;
  const project = useProject(
    reference && environmentId
      ? scopeProjectRef(environmentId, ProjectId.make(reference.projectId))
      : null,
  );
  const detail = useEnvironmentQuery(
    reference && environmentId
      ? pullRequestEnvironment.detail({
          environmentId,
          input: {
            projectId: ProjectId.make(reference.projectId),
            repository: reference.repository,
            number: reference.number,
          },
        })
      : null,
  ).data;
  return reference
    ? (detail?.url ??
        gitHubPullRequestBrowserUrl(
          project?.repositoryIdentity,
          reference.repository,
          reference.number,
        ))
    : undefined;
}
