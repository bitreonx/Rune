import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { ActionRegistry } from "../Services/ActionRegistry.ts";
import { SqlitePersistenceMemory } from "./Sqlite.ts";
import { ActionRegistryLive } from "./ActionRegistry.ts";

const registryLayer = ActionRegistryLive.pipe(Layer.provideMerge(SqlitePersistenceMemory));

const projectAction = {
  id: "action.release" as const,
  name: "Release",
  scope: "project" as const,
  kind: "recipe" as const,
  source: "user-created" as const,
  intentSignatures: ["release", "ship latest"],
  parameters: [
    {
      name: "token",
      type: "secret-reference" as const,
      required: false,
      secret: true,
    },
    { name: "target", type: "string" as const, required: false },
  ],
  preconditions: [],
  steps: [
    { id: "release", name: "Release", kind: "run-command" as const, command: "pnpm release" },
  ],
  outputs: [],
  verification: [{ kind: "command-succeeded" as const }],
  approvalPolicy: "on-dangerous-step" as const,
  fallbackPolicy: "agent" as const,
  capabilities: [],
  provenance: { source: "test", successfulRunIds: [] },
  version: 9,
  enabled: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ActionRegistry", () => {
  it.effect("keeps versions and scope contexts durable", () =>
    Effect.gen(function* () {
      const registry = yield* ActionRegistry;
      const created = yield* registry.create({
        action: projectAction,
        projectId: "project-1",
        workspaceRoot: "C:\\repo",
      });
      const versioned = yield* registry.version({
        action: { ...projectAction, name: "Release v2" },
        projectId: "project-1",
        workspaceRoot: "C:\\repo",
        expectedVersion: 1,
      });
      const allVersions = yield* registry.list({
        scope: "project",
        projectId: "project-1",
        workspaceRoot: "C:\\repo",
        includeVersions: true,
        includeDisabled: true,
      });

      expect(created.action.action.version).toBe(1);
      expect(versioned.action.action.version).toBe(2);
      expect(allVersions.actions.map(({ action }) => action.version)).toEqual([2, 1]);
      expect(allVersions.actions[0]?.projectId).toBe("project-1");
    }).pipe(Effect.provide(registryLayer)),
  );

  it.effect("approves a learned proposal and records only redacted run parameters", () =>
    Effect.gen(function* () {
      const registry = yield* ActionRegistry;
      const proposalAction = {
        ...projectAction,
        id: "action.learned-release" as const,
        source: "learned" as const,
        provenance: { source: "verified-run", successfulRunIds: ["run-1"] },
      };
      yield* registry.createProposal({
        proposal: {
          proposalId: "proposal-1",
          action: proposalAction,
          reason: "Repeated verified release workflow.",
          successfulRunIds: ["run-1"],
          status: "proposed",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        projectId: "project-1",
        workspaceRoot: "C:\\repo",
      });

      const approved = yield* registry.approveProposal(
        { proposalId: "proposal-1" },
        "session-approver",
      );
      yield* registry.recordRun({
        runId: "run-2",
        actionId: "action.learned-release",
        actionVersion: approved.action!.action.version,
        scope: "project",
        projectId: "project-1",
        workspaceRoot: "C:\\repo",
        status: "succeeded",
        parameters: { token: "super-secret", target: "production" },
        modelCalls: 0,
        recordedAt: "2026-01-01T00:02:00.000Z",
      });
      const history = yield* registry.listRunHistory({ actionId: "action.learned-release" });

      expect(approved.proposal.proposal.status).toBe("approved");
      expect(approved.action?.action.provenance.approvedBy).toBe("session-approver");
      expect(history.runs[0]?.parameters).toEqual({
        token: "<credential-ref>",
        target: "production",
      });
    }).pipe(Effect.provide(registryLayer)),
  );

  it.effect("does not allow a proposal to be decided twice", () =>
    Effect.gen(function* () {
      const registry = yield* ActionRegistry;
      const proposalAction = {
        ...projectAction,
        id: "action.dismiss-me" as const,
        source: "learned" as const,
        provenance: { source: "verified-run", successfulRunIds: ["run-1"] },
      };
      yield* registry.createProposal({
        proposal: {
          proposalId: "proposal-2",
          action: proposalAction,
          reason: "Test dismissal.",
          successfulRunIds: ["run-1"],
          status: "proposed",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        projectId: "project-1",
        workspaceRoot: "C:\\repo",
      });
      yield* registry.dismissProposal({ proposalId: "proposal-2" }, "session-approver");
      const error = yield* registry
        .rejectProposal({ proposalId: "proposal-2" }, "session-approver")
        .pipe(Effect.flip);
      expect(error.code).toBe("invalid-state");
    }).pipe(Effect.provide(registryLayer)),
  );

  it.effect("creates an approval-gated learned proposal after repeated verified runs", () =>
    Effect.gen(function* () {
      const registry = yield* ActionRegistry;
      yield* registry.create({
        action: { ...projectAction, id: "action.repeatable-release" as const },
        projectId: "project-1",
        workspaceRoot: "C:\\repo",
      });
      for (const [index, runId] of ["repeat-1", "repeat-2", "repeat-3"].entries()) {
        yield* registry.recordRun({
          runId,
          actionId: "action.repeatable-release",
          actionVersion: 1,
          scope: "project",
          projectId: "project-1",
          workspaceRoot: "C:\\repo",
          status: "started",
          parameters: {},
          modelCalls: 0,
          recordedAt: `2026-01-01T00:0${index}:00.000Z`,
        });
        yield* registry.settleRun({
          runId,
          status: "succeeded",
          completedAt: `2026-01-01T00:0${index}:30.000Z`,
        });
      }
      const proposals = yield* registry.listProposals({
        status: "proposed",
        projectId: "project-1",
        workspaceRoot: "C:\\repo",
      });
      expect(proposals.proposals).toHaveLength(1);
      expect(proposals.proposals[0]?.proposal.action.source).toBe("learned");
      expect(proposals.proposals[0]?.proposal.successfulRunIds).toEqual([
        "repeat-1",
        "repeat-2",
        "repeat-3",
      ]);
    }).pipe(Effect.provide(registryLayer)),
  );
});
