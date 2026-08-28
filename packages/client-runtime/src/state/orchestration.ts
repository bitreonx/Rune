import { CROSS_THREAD_WS_METHODS, ORCHESTRATION_WS_METHODS } from "@rune/contracts";
import { Atom } from "effect/unstable/reactivity";

import {
  createAtomCommandScheduler,
  createEnvironmentRpcCommand,
  createEnvironmentRpcQueryAtomFamily,
} from "./runtime.ts";
import type { EnvironmentRegistry } from "../connection/registry.ts";

export function createOrchestrationEnvironmentAtoms<R, E>(
  runtime: Atom.AtomRuntime<EnvironmentRegistry | R, E>,
) {
  const agentChatScheduler = createAtomCommandScheduler();
  const agentChatConcurrency = {
    mode: "serial" as const,
    key: ({ environmentId, input }: { environmentId: string; input: { threadId: string; agentId: string } }) =>
      JSON.stringify([environmentId, input.threadId, input.agentId]),
  };
  return {
    turnDiff: createEnvironmentRpcQueryAtomFamily(runtime, {
      label: "environment-data:orchestration:turn-diff",
      tag: ORCHESTRATION_WS_METHODS.getTurnDiff,
    }),
    workflowScript: createEnvironmentRpcQueryAtomFamily(runtime, {
      label: "environment-data:orchestration:workflow-script",
      tag: ORCHESTRATION_WS_METHODS.getWorkflowScript,
      // Scripts are immutable per run: cache generously.
      staleTimeMs: 300_000,
      idleTtlMs: 300_000,
    }),
    fullThreadDiff: createEnvironmentRpcQueryAtomFamily(runtime, {
      label: "environment-data:orchestration:full-thread-diff",
      tag: ORCHESTRATION_WS_METHODS.getFullThreadDiff,
    }),
    threadSearch: createEnvironmentRpcQueryAtomFamily(runtime, {
      label: "environment-data:orchestration:thread-search",
      tag: ORCHESTRATION_WS_METHODS.searchThreads,
      staleTimeMs: 30_000,
      idleTtlMs: 60_000,
    }),
    threadListForPicker: createEnvironmentRpcQueryAtomFamily(runtime, {
      label: "environment-data:orchestration:thread-picker",
      tag: CROSS_THREAD_WS_METHODS.listForPicker,
      staleTimeMs: 5_000,
      idleTtlMs: 30_000,
    }),
    capsulePreview: createEnvironmentRpcQueryAtomFamily(runtime, {
      label: "environment-data:orchestration:capsule-preview",
      tag: CROSS_THREAD_WS_METHODS.capsulePreview,
      staleTimeMs: 5_000,
      idleTtlMs: 30_000,
    }),
    capsuleExpand: createEnvironmentRpcQueryAtomFamily(runtime, {
      label: "environment-data:orchestration:capsule-expand",
      tag: CROSS_THREAD_WS_METHODS.capsuleExpand,
      staleTimeMs: 0,
    }),
    agentChat: createEnvironmentRpcQueryAtomFamily(runtime, {
      label: "environment-data:orchestration:agent-chat",
      tag: ORCHESTRATION_WS_METHODS.getAgentChat,
      staleTimeMs: 0,
    }),
    sendAgentMessage: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:orchestration:send-agent-message",
      tag: ORCHESTRATION_WS_METHODS.sendAgentMessage,
      scheduler: agentChatScheduler,
      concurrency: agentChatConcurrency,
    }),
    interruptAgentMessage: createEnvironmentRpcCommand(runtime, {
      label: "environment-command:orchestration:interrupt-agent-message",
      tag: ORCHESTRATION_WS_METHODS.interruptAgentMessage,
      scheduler: agentChatScheduler,
      concurrency: agentChatConcurrency,
    }),
    archivedShellSnapshot: createEnvironmentRpcQueryAtomFamily(runtime, {
      label: "environment-data:orchestration:archived-shell-snapshot",
      tag: ORCHESTRATION_WS_METHODS.getArchivedShellSnapshot,
    }),
  };
}
