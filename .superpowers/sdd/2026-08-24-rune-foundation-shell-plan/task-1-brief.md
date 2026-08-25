### Task 1: Add the RUNE motion and visual-language contract

**Files:**
- Create: apps/web/src/runeMotion.ts
- Create: apps/web/src/runeMotion.test.ts
- Modify: apps/web/src/index.css
- Modify: apps/web/src/themePalette.ts only where the default palette preview needs the new semantic roles

**Interfaces:**
- Produces RUNE_MOTION_MS with fast, standard, and slow numeric durations.
- Produces resolveRuneMotionDuration(durationMs: number, reducedMotion: boolean): number.
- Produces CSS variables --rune-violet-*, --rune-copper-*, --rune-motion-fast, --rune-motion-standard, and --rune-motion-slow.

- [ ] **Step 1: Write the failing motion contract test**

~~~ts
import { describe, expect, it } from "vitest";
import { RUNE_MOTION_MS, resolveRuneMotionDuration } from "./runeMotion";

describe("RUNE motion contract", () => {
  it("uses short product motion durations", () => {
    expect(RUNE_MOTION_MS.fast).toBe(160);
    expect(RUNE_MOTION_MS.standard).toBe(200);
    expect(RUNE_MOTION_MS.slow).toBe(240);
  });

  it("disables motion when reduced motion is requested", () => {
    expect(resolveRuneMotionDuration(RUNE_MOTION_MS.standard, true)).toBe(0);
    expect(resolveRuneMotionDuration(RUNE_MOTION_MS.standard, false)).toBe(200);
  });
});
~~~

- [ ] **Step 2: Run the focused test and verify it fails**

Run: pnpm.cmd --filter @t3tools/web test -- --run src/runeMotion.test.ts

Expected: FAIL because the motion contract does not exist.

- [ ] **Step 3: Implement the contract and semantic CSS roles**

Add the exact exported values used by the test:

~~~ts
export const RUNE_MOTION_MS = Object.freeze({
  fast: 160,
  standard: 200,
  slow: 240,
} as const);

export function resolveRuneMotionDuration(durationMs: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : durationMs;
}
~~~

In index.css, add the violet, copper, surface, and motion variables inside the existing light/dark semantic theme blocks. Add prefers-reduced-motion overrides that set the RUNE motion variables to 0ms without removing focus transitions that improve orientation.

- [ ] **Step 4: Run the focused test and CSS build**

Run: pnpm.cmd --filter @t3tools/web test -- --run src/runeMotion.test.ts

Expected: PASS.

Run: pnpm.cmd --filter @t3tools/web build

Expected: PASS, with no new CSS parse errors.

