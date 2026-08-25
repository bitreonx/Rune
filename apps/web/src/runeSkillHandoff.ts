const PENDING_SKILL_KEY = "rune:pending-skill";

export function setPendingRuneSkill(skillName: string): void {
  try {
    window.sessionStorage.setItem(PENDING_SKILL_KEY, skillName);
  } catch {
    // Private browsing or a locked-down host may reject session storage. The
    // detail panel still offers the explicit copy-command action.
  }
}

export function consumePendingRuneSkill(): string | null {
  try {
    const value = window.sessionStorage.getItem(PENDING_SKILL_KEY)?.trim() ?? "";
    if (!value) return null;
    window.sessionStorage.removeItem(PENDING_SKILL_KEY);
    return value;
  } catch {
    return null;
  }
}

