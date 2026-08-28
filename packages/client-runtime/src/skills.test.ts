import {
  EnvironmentId,
  type SkillRegistrySnapshot,
  WS_METHODS,
} from "@rune/contracts";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as SubscriptionRef from "effect/SubscriptionRef";

import {
  AVAILABLE_CONNECTION_STATE,
  PrimaryConnectionTarget,
  type PreparedConnection,
  type SupervisorConnectionState,
} from "./connection/model.ts";
import * as EnvironmentSupervisor from "./connection/supervisor.ts";
import * as RpcSession from "./rpc/session.ts";
import type { WsRpcProtocolClient } from "./rpc/protocol.ts";
import { getAutoInvocableSkills, getSkillBody, listSkills, refreshSkills } from "./skills.ts";

const target = new PrimaryConnectionTarget({
  environmentId: EnvironmentId.make("skill-test-environment"),
  label: "Skill test environment",
  httpBaseUrl: "https://environment.example.test",
  wsBaseUrl: "wss://environment.example.test",
});

const snapshot: SkillRegistrySnapshot = {
  version: 1,
  skills: [{
    id: "hash:review",
    name: "review",
    description: "Review code.",
    version: 1,
    source: "local-filesystem",
    sourceAdapter: "test",
    scope: "project",
    explicitOnly: false,
    aliases: [],
    requiredTools: [],
    optionalTools: [],
    references: [],
    scripts: [],
    assets: [],
    compatibility: [],
    dependencies: [],
    contentHash: "hash",
    enabled: true,
    lastUsedAt: null,
  }],
};

function makeSession(client: WsRpcProtocolClient): RpcSession.RpcSession {
  return { client, initialConfig: Effect.never, ready: Effect.void, probe: Effect.void, closed: Effect.never };
}

it.effect("routes registry list, refresh, and body calls through the shared RPC client", () =>
  Effect.gen(function* () {
    const state = yield* SubscriptionRef.make<SupervisorConnectionState>(AVAILABLE_CONNECTION_STATE);
    const activeSession = yield* SubscriptionRef.make<Option.Option<RpcSession.RpcSession>>(Option.none());
    const prepared = yield* SubscriptionRef.make<Option.Option<PreparedConnection>>(Option.none());
    const supervisor = EnvironmentSupervisor.EnvironmentSupervisor.of({
      target,
      state,
      session: activeSession,
      prepared,
      connect: Effect.void,
      disconnect: Effect.void,
      retryNow: Effect.void,
    });
    const calls: string[] = [];
    const client = {
      [WS_METHODS.skillsList]: () => { calls.push(WS_METHODS.skillsList); return Effect.succeed(snapshot); },
      [WS_METHODS.skillsRefresh]: () => { calls.push(WS_METHODS.skillsRefresh); return Effect.succeed(snapshot); },
      [WS_METHODS.skillsGetBody]: (input: { id: string }) => {
        calls.push(`${WS_METHODS.skillsGetBody}:${input.id}`);
        return Effect.succeed({ id: input.id, contentHash: "hash", body: "# Review" });
      },
    } as unknown as WsRpcProtocolClient;
    yield* SubscriptionRef.set(activeSession, Option.some(makeSession(client)));

    const list = yield* listSkills().pipe(Effect.provideService(EnvironmentSupervisor.EnvironmentSupervisor, supervisor));
    const refreshed = yield* refreshSkills().pipe(Effect.provideService(EnvironmentSupervisor.EnvironmentSupervisor, supervisor));
    const body = yield* getSkillBody({ id: snapshot.skills[0]!.id }).pipe(
      Effect.provideService(EnvironmentSupervisor.EnvironmentSupervisor, supervisor),
    );
    expect(list).toEqual(snapshot);
    expect(refreshed).toEqual(snapshot);
    expect(body.body).toBe("# Review");
    expect(calls).toEqual([WS_METHODS.skillsList, WS_METHODS.skillsRefresh, `${WS_METHODS.skillsGetBody}:hash:review`]);
  }),
);

it("preserves explicit-only semantics in the client projection", () => {
  expect(getAutoInvocableSkills([
    ...snapshot.skills,
    { ...snapshot.skills[0]!, id: "hash:explicit", explicitOnly: true },
    { ...snapshot.skills[0]!, id: "hash:disabled", enabled: false },
  ]).map((skill) => skill.id)).toEqual(["hash:review"]);
});
