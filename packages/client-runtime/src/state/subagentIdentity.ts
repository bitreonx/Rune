/**
 * Sub-agent identity generation: whimsical names and colorful icons.
 * Uses deterministic seeded random generation based on agent ID for consistency.
 */

/**
 * Simple seeded random number generator (Mulberry32).
 * Returns a function that generates numbers in [0, 1).
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert a string to a numeric seed.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Whimsical AI-themed name parts for generating memorable agent names.
 * Mix of syllables that sound artificial, alien, and slightly mysterious.
 */
const NAME_PREFIXES = [
  "Lob",
  "Loj",
  "Zeph",
  "Kor",
  "Vex",
  "Nyx",
  "Qix",
  "Pyx",
  "Rax",
  "Tyx",
  "Zar",
  "Kir",
  "Vox",
  "Lux",
  "Nex",
  "Zyx",
  "Mor",
  "Tor",
  "Dax",
  "Hex",
  "Xyr",
  "Syx",
  "Brax",
  "Crux",
  "Drax",
  "Flux",
  "Glyx",
  "Prax",
  "Spyx",
  "Tryx",
] as const;

const NAME_SUFFIXES = [
  "arna",
  "rma",
  "ion",
  "ara",
  "eon",
  "ora",
  "yx",
  "ix",
  "ex",
  "ax",
  "on",
  "os",
  "us",
  "is",
  "el",
  "al",
  "or",
  "ar",
  "ith",
  "eth",
  "ath",
  "yn",
  "en",
  "an",
  "ira",
  "ida",
  "ina",
  "ika",
  "ima",
  "ila",
] as const;

/**
 * Generate a whimsical, memorable name for a sub-agent.
 * Names are deterministic based on the agent ID for consistency.
 *
 * Examples: Lobarna, Lojrma, Zephion, Korara, Vexeon, Nyxora
 */
export function generateSubagentName(agentId: string): string {
  const seed = hashString(agentId);
  const random = createSeededRandom(seed);

  const prefix = NAME_PREFIXES[prefixIndex] ?? "Rune";
  const suffix = NAME_SUFFIXES[suffixIndex] ?? "bot";

  return prefix + suffix;
}

/**
 * Generate a vibrant, colorful HSL color for a sub-agent icon.
 * Colors are deterministic based on the agent ID for consistency.
 *
 * Uses HSL color space for perceptually pleasing, saturated colors:
 * - Hue: full spectrum (0-360)
 * - Saturation: 60-85% (vibrant but not garish)
 * - Lightness: 45-65% (readable against both light and dark backgrounds)
 *
 * Returns an HSL string like "hsl(210, 75%, 55%)"
 */
export function generateSubagentColor(agentId: string): string {
  const seed = hashString(agentId + "-color"); // Different seed than name
  const random = createSeededRandom(seed);

  const hue = Math.floor(random() * 360);
  const saturation = Math.floor(60 + random() * 25); // 60-85%
  const lightness = Math.floor(45 + random() * 20); // 45-65%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export const SUBAGENT_ICON_NAMES = [
  "sparkles",
  "cpu",
  "atom",
  "zap",
  "brain",
  "compass",
  "flame",
  "orbit",
  "wand",
  "boxes",
  "hexagon",
  "radio",
  "bot",
  "workflow",
] as const;

export type SubagentIconName = (typeof SUBAGENT_ICON_NAMES)[number];

/**
 * Generate a deterministic icon glyph name for a sub-agent.
 */
export function generateSubagentIcon(agentId: string): SubagentIconName {
  const seed = hashString(agentId + "-icon");
  const random = createSeededRandom(seed);
  const index = Math.floor(random() * SUBAGENT_ICON_NAMES.length);
  return SUBAGENT_ICON_NAMES[index]!;
}

/**
 * Generate both name, color, and icon for a sub-agent in one call.
 */
export interface SubagentIdentity {
  readonly generatedName: string;
  readonly iconColor: string;
  readonly iconName: SubagentIconName;
}

export function generateSubagentIdentity(agentId: string): SubagentIdentity {
  return {
    generatedName: generateSubagentName(agentId),
    iconColor: generateSubagentColor(agentId),
    iconName: generateSubagentIcon(agentId),
  };
}
