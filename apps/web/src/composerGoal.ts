export type ComposerGoalCommand =
  | { readonly kind: "set"; readonly goal: string }
  | { readonly kind: "clear" }
  | { readonly kind: "status" }
  | { readonly kind: "empty" };

export function parseComposerGoalCommand(text: string): ComposerGoalCommand | null {
  const match = /^\/goal(?:\s+(.*))?$/i.exec(text.trim());
  if (!match) return null;

  const value = match[1]?.trim() ?? "";
  if (!value) return { kind: "empty" };
  if (/^(?:clear|cancel|off)$/i.test(value)) return { kind: "clear" };
  if (/^(?:status|show)$/i.test(value)) return { kind: "status" };
  return { kind: "set", goal: value };
}

export function formatGoalAwarePrompt(goal: string | null | undefined, prompt: string): string {
  const normalizedGoal = goal?.trim();
  if (!normalizedGoal) return prompt;
  return `[RUNE active goal]\n${normalizedGoal}\n[/RUNE active goal]\n\n${prompt}`;
}
