# RUNE Plan Mode Architecture

Plan Mode is a provider-neutral control plane. `PlanSession` is the durable
record keyed to a chat thread; the web and mobile clients treat legacy
interaction mode as presentation state only. The server validates lifecycle
transitions and optimistic versions before persisting a revision.

The structured model is:

```text
ASK decisions → SPEC artifact → PLAN task DAG → approval → BUILD workers → REVIEW → VERIFY
```

Questions and tasks are ordered DAG nodes. `packages/shared/src/plan.ts`
contains deterministic frontier, validation, completeness, and transition
rules. `packages/shared/src/planScheduler.ts` selects runnable tasks only when
dependencies are complete, provider availability is explicit, capacity exists,
and ownership scopes do not conflict. Read-only tasks never block writers;
overlapping writers must be serialized or assigned isolated workspaces by the
runtime caller.

The persisted lifecycle is implemented by the `PlanSession` service and the
`planSession.*` WebSocket methods. Create, get, update, transition, and resume
all use the same session id and optimistic version. A plan cannot enter BUILD
without an explicit transition through the approval boundary, and a plan
cannot complete while tasks remain unsettled.

Provider and model bindings belong to role policies, not task identity. A
planner, executor, reviewer, and verifier may therefore use different harnesses
or provider instances without changing the task graph. Child-agent creation
must use the existing persisted child-thread contract so worker conversations
remain ordinary RUNE threads.

Live provider execution, real child-thread walkthroughs, and packaged-client
acceptance remain runtime verification responsibilities; this document does
not treat static contracts as proof of those external behaviors.
