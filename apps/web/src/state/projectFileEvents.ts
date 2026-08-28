import type { EnvironmentId, ProjectFileEvent } from "@rune/contracts";
import { useAtomValue } from "@effect/atom-react";
import * as Option from "effect/Option";
import { AsyncResult } from "effect/unstable/reactivity";
import { useEffect, useRef } from "react";

import { projectEnvironment } from "~/state/projects";

/**
 * Subscribes to the server's workspace filesystem watcher for one cwd.
 * The subscription lives exactly as long as the calling component; the
 * server debounces and batches raw watcher noise, so each callback receives
 * one coalesced created/changed/removed event.
 */
export function useWorkspaceFileEvents(
  environmentId: EnvironmentId,
  cwd: string,
  onEvent: (event: ProjectFileEvent) => void,
): void {
  const batch = useAtomValue(
    projectEnvironment.fileEvents({ environmentId, input: { cwd } }),
  );
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  });
  useEffect(() => {
    const value = Option.getOrNull(AsyncResult.value(batch));
    if (value === null) return;
    for (const event of value.events) {
      handlerRef.current(event);
    }
  }, [batch]);
}
