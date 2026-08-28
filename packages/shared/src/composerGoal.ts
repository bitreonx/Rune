export type ComposerGoalCommand =
  | { readonly kind: "set"; readonly goal: string }
  | { readonly kind: "clear" }
  | { readonly kind: "status" }
  | { readonly kind: "empty" };

/** Keeps device-local state and every provider prompt bounded by the same contract. */
export const MAX_COMPOSER_GOAL_CHARS = 4_000;

export function parseComposerGoalCommand(text: string): ComposerGoalCommand | null {
  const match = /^\/goal(?:\s+(.*))?$/iu.exec(text.trim());
  if (!match) return null;

  const value = match[1]?.trim() ?? "";
  if (!value) return { kind: "empty" };
  if (/^(?:clear|cancel|off)$/iu.test(value)) return { kind: "clear" };
  if (/^(?:status|show)$/iu.test(value)) return { kind: "status" };
  return { kind: "set", goal: value.slice(0, MAX_COMPOSER_GOAL_CHARS) };
}

export function formatGoalAwarePrompt(goal: string | null | undefined, prompt: string): string {
  const normalizedGoal = goal?.trim().slice(0, MAX_COMPOSER_GOAL_CHARS);
  if (!normalizedGoal) return prompt;
  return `[RUNE active goal]\n${normalizedGoal}\n[/RUNE active goal]\n\n${prompt}`;
}
