# Task 2 Fix-Round Re-Review — Quiet RUNE Chrome Default

## Scope

This re-review verifies only the prior Important finding: before client settings hydrate, `resolveEnvironmentIdentificationMode` returned `none`, so the default environment pill was absent on the initial header render.

Git metadata is unavailable in this source snapshot. No source files were mutated.

## Finding review

### Important — pre-hydration default pill

**ADDRESSED.**

Evidence:

- `apps/web/src/hooks/useSettings.ts:243-256` now returns `"pill"` whenever `settingsHydrated` is false, regardless of the snapshot mode. This prevents the initial default header from rendering neither a pill nor artwork.
- Once hydrated, the resolver returns the supplied persisted mode for `artwork`, `pill`, and `none` when no palette adaptation applies. The existing intentional rule still changes explicit `artwork` to `pill` for palette themes that do not allow artwork; explicit `none` remains `none`.
- `apps/web/src/hooks/useSettings.test.ts:11-24` parameterizes all three modes before and after hydration. It asserts `pill` for each unhydrated case and exact preservation of each hydrated explicit mode.
- `apps/web/src/components/SidebarStageBackdrop.test.tsx:118-140` continues to verify the rendered header branches: default pill without the backdrop, explicit artwork with the backdrop, and explicit none with neither output.

Focused verification run:

```text
pnpm.cmd exec vp test run packages/contracts/src/settings.test.ts apps/web/src/hooks/useSettings.test.ts apps/web/src/components/RuneMark.test.tsx apps/web/src/components/SidebarStageBackdrop.test.tsx

Test Files  4 passed (4)
Tests       68 passed (68)
```

The regression coverage is meaningful for this finding: it exercises the load-bearing pure resolver across every relevant mode and hydration state, while the existing header tests verify the resolver outputs’ visible pill/artwork/none consequences. It does not require a browser to establish the corrected branch behavior.

## New breakage

None observed in the scoped resolver/header path. The palette-specific `artwork` to `pill` adaptation is pre-existing and remains covered; it is not a regression from this fix.

## Out-of-scope observations

- No browser, desktop, mobile, or live initial-render verification was performed.
- No broad test suite was run.
- The implementer report records a successful web typecheck; it was not independently rerun in this narrowly scoped re-review.
- No review was performed of unrelated Task 2 findings or surfaces.

## Fix-round verdict

**PASS — the single Important finding is ADDRESSED.** The pre-hydration default now supplies the required quiet pill, persisted explicit `artwork`/`pill`/`none` behavior remains preserved after hydration, and focused regression coverage passes.
