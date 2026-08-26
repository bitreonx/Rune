/**
 * Tiny external store letting any surface (composer picker, settings page,
 * command palette) request the guided "Add Claude service" dialog without
 * owning its React state. The host component subscribes and renders the
 * wizard while a request is pending.
 *
 * @module claudeServiceSetupBus
 */
import { useSyncExternalStore } from "react";

import type { EnvironmentId } from "@rune/contracts";

export interface ClaudeServiceSetupRequest {
  readonly environmentId: EnvironmentId;
  /** Where the dialog was opened from; decides the post-save navigation. */
  readonly origin: "composer" | "settings";
}

let currentRequest: ClaudeServiceSetupRequest | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ClaudeServiceSetupRequest | null {
  return currentRequest;
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function openClaudeServiceSetup(request: ClaudeServiceSetupRequest): void {
  currentRequest = request;
  emit();
}

export function closeClaudeServiceSetup(): void {
  if (currentRequest === null) return;
  currentRequest = null;
  emit();
}

/** Synchronous read for non-React callers. */
export function isClaudeServiceSetupOpen(): boolean {
  return currentRequest !== null;
}

export function useClaudeServiceSetupRequest(): ClaudeServiceSetupRequest | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
