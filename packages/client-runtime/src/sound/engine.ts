import type { SoundEventId } from "./preferences.ts";

/**
 * A sound as data: a short stack of tones (and optionally one filtered noise
 * burst) scheduled relative to effect start. Keeping scores declarative
 * makes them tunable without touching playback code.
 */
interface ToneSpec {
  readonly type: OscillatorType;
  readonly frequency: number;
  /**
   * Where the pitch settles by the end of the tone, Hz. Struck bodies sag a
   * percent or two below their strike pitch; even a tiny fall is most of what
   * makes a hit feel physical instead of synthetic.
   */
  readonly frequencyTo?: number;
  readonly startAt: number;
  readonly duration: number;
  /**
   * Rise time to peak gain, seconds. Struck voices want the default snap;
   * pads and swells ask for slower so they bloom instead of tick.
   */
  readonly attack?: number;
  /** Peak gain of the envelope. */
  readonly gain: number;
  /** Stereo position, -1 left .. 1 right. Subtle offsets give real-space width. */
  readonly pan?: number;
  /**
   * Lowpass sweep over the tone, Hz. The falling sweep darkens the tail the
   * way a struck marimba bar does — this is most of what separates a soft
   * mallet hit from an organ beep.
   */
  readonly lowpassFrom?: number;
  readonly lowpassTo?: number;
}

interface NoiseSpec {
  readonly startAt: number;
  readonly duration: number;
  readonly gain: number;
  /** Lowpass sweep, Hz. The falling sweep is what makes a tick soft. */
  readonly lowpassFrom: number;
  readonly lowpassTo: number;
}

interface SoundScore {
  readonly tones: ReadonlyArray<ToneSpec>;
  readonly noise?: NoiseSpec;
  /**
   * How much room the effect plays in, 0 dry .. 1 full send. Ticks stay tight
   * and close; reward moments get air. Omitted means the default room.
   */
  readonly space?: number;
}

const CLICK_DETUNE_RANGE_CENTS = 25;

/** Per-press pitch variation, so rapid clicking never sounds mechanical. */
export function randomClickDetune(rng: () => number = Math.random): number {
  return (rng() * 2 - 1) * CLICK_DETUNE_RANGE_CENTS;
}

export function applyDetune(frequency: number, cents: number): number {
  return frequency * Math.pow(2, cents / 1200);
}

const ATTACK_SECONDS = 0.003;
const GAIN_FLOOR = 0.0001;

/**
 * Fills the shared noise buffer deterministically (xorshift32). A fixed seed
 * keeps every press spectrally identical; the per-press detune is the only
 * intended source of variation.
 */
function fillNoiseBuffer(channel: Float32Array): void {
  let state = 0x9e3779b9;
  for (let i = 0; i < channel.length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    channel[i] = (state / 0xffffffff) * 2 - 1;
  }
}

/** Wet mix of the reverb send at space = 1; a hint of room, never a hall. */
const WET_GAIN = 0.16;

/**
 * Fills one channel of the reverb impulse: white noise under an exponential
 * fade, which a convolver reads as a small bright room. Deterministic like
 * the noise buffer, and stereo-decorrelated via distinct seeds per channel.
 */
function fillReverbImpulse(channel: Float32Array, seed: number): void {
  let state = seed;
  const decayPerSample = 5 / channel.length;
  for (let i = 0; i < channel.length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    channel[i] = ((state / 0xffffffff) * 2 - 1) * Math.exp(-decayPerSample * i);
  }
}

// ---- Done -----------------------------------------------------------------
// The reward moment gets room to land: every variant resolves upward through
// C major and holds its final note long enough to feel like an arrival.

// Default: a struck glass-marimba arpeggio, G5 -> C6 -> E6 -> G6 over a soft
// C4 root with one C7 sparkle on the landing. Notes are spaced wide enough
// that each blooms alone before the next lands — length comes from the
// spacing and the long top note, clarity from thin octave partials.
const DONE_CHIME_SCORE: SoundScore = {
  tones: [
    {
      type: "sine",
      frequency: 261.63,
      frequencyTo: 257,
      startAt: 0,
      duration: 0.7,
      gain: 0.1,
      lowpassFrom: 1200,
      lowpassTo: 500,
    },
    {
      type: "sine",
      frequency: 783.99,
      frequencyTo: 772.2,
      startAt: 0,
      duration: 0.38,
      gain: 0.34,
      pan: -0.14,
      lowpassFrom: 6400,
      lowpassTo: 1600,
    },
    {
      type: "sine",
      frequency: 1568,
      frequencyTo: 1542,
      startAt: 0,
      duration: 0.15,
      gain: 0.07,
      pan: -0.14,
      lowpassFrom: 8000,
      lowpassTo: 3000,
    },
    {
      type: "sine",
      frequency: 1046.5,
      frequencyTo: 1030.8,
      startAt: 0.13,
      duration: 0.55,
      gain: 0.38,
      pan: 0.15,
      lowpassFrom: 7000,
      lowpassTo: 1700,
    },
    {
      type: "sine",
      frequency: 2093,
      frequencyTo: 2062,
      startAt: 0.13,
      duration: 0.2,
      gain: 0.075,
      pan: 0.15,
      lowpassFrom: 8800,
      lowpassTo: 3200,
    },
    {
      type: "sine",
      frequency: 1318.51,
      frequencyTo: 1298.7,
      startAt: 0.26,
      duration: 0.7,
      gain: 0.27,
      pan: -0.05,
      lowpassFrom: 7800,
      lowpassTo: 2000,
    },
    {
      type: "sine",
      frequency: 2637.02,
      frequencyTo: 2597,
      startAt: 0.26,
      duration: 0.22,
      gain: 0.06,
      pan: -0.05,
      lowpassFrom: 10000,
      lowpassTo: 3600,
    },
    {
      type: "sine",
      frequency: 1568,
      frequencyTo: 1544.5,
      startAt: 0.42,
      duration: 0.95,
      gain: 0.3,
      pan: 0.08,
      lowpassFrom: 8600,
      lowpassTo: 2100,
    },
    {
      type: "sine",
      frequency: 3136,
      frequencyTo: 3089,
      startAt: 0.42,
      duration: 0.28,
      gain: 0.06,
      pan: 0.08,
      lowpassFrom: 11000,
      lowpassTo: 3800,
    },
    {
      type: "sine",
      frequency: 2093,
      frequencyTo: 2071,
      startAt: 0.42,
      duration: 0.35,
      gain: 0.045,
      pan: -0.09,
      lowpassFrom: 12000,
      lowpassTo: 5000,
    },
  ],
};

// Three big bell strikes climbing C5 -> E5 -> G5, each voiced with a stretched
// inharmonic partial (the 2x and 2.76x overtones real bells carry). The last
// strike rings longest of all — this is the ceremonial option.
const DONE_BELLS_SCORE: SoundScore = {
  tones: [
    {
      type: "sine",
      frequency: 523.25,
      frequencyTo: 520.6,
      startAt: 0,
      duration: 0.85,
      gain: 0.3,
      lowpassFrom: 8500,
      lowpassTo: 2000,
    },
    { type: "sine", frequency: 1046.5, startAt: 0, duration: 0.4, gain: 0.09 },
    { type: "sine", frequency: 1444, startAt: 0, duration: 0.22, gain: 0.045 },
    {
      type: "sine",
      frequency: 659.26,
      frequencyTo: 656,
      startAt: 0.24,
      duration: 1,
      gain: 0.3,
      pan: 0.12,
      lowpassFrom: 8800,
      lowpassTo: 2100,
    },
    { type: "sine", frequency: 1318.51, startAt: 0.24, duration: 0.45, gain: 0.08, pan: 0.12 },
    { type: "sine", frequency: 1820, startAt: 0.24, duration: 0.24, gain: 0.04, pan: 0.12 },
    {
      type: "sine",
      frequency: 783.99,
      frequencyTo: 781,
      startAt: 0.48,
      duration: 1.35,
      gain: 0.28,
      pan: -0.06,
      lowpassFrom: 9000,
      lowpassTo: 2300,
    },
    { type: "sine", frequency: 1568, startAt: 0.48, duration: 0.6, gain: 0.07, pan: -0.06 },
    { type: "sine", frequency: 2164, startAt: 0.48, duration: 0.3, gain: 0.035, pan: -0.06 },
  ],
};

// The game-flavored one: a fast G-C-E-G run up the C-major scale into a held
// C-major chord with a bass note under it — the sound of a progress bar
// filling all the way.
const DONE_LEVEL_UP_SCORE: SoundScore = {
  tones: [
    {
      type: "sine",
      frequency: 783.99,
      frequencyTo: 776,
      startAt: 0,
      duration: 0.1,
      gain: 0.3,
      lowpassFrom: 7000,
      lowpassTo: 2600,
    },
    {
      type: "sine",
      frequency: 1046.5,
      frequencyTo: 1037,
      startAt: 0.08,
      duration: 0.1,
      gain: 0.3,
      lowpassFrom: 7200,
      lowpassTo: 2800,
    },
    {
      type: "sine",
      frequency: 1318.51,
      frequencyTo: 1306,
      startAt: 0.16,
      duration: 0.1,
      gain: 0.28,
      lowpassFrom: 7400,
      lowpassTo: 3000,
    },
    {
      type: "sine",
      frequency: 1568,
      frequencyTo: 1553,
      startAt: 0.24,
      duration: 0.14,
      gain: 0.3,
      lowpassFrom: 7600,
      lowpassTo: 3200,
    },
    {
      type: "sine",
      frequency: 261.63,
      frequencyTo: 258,
      startAt: 0.4,
      duration: 0.7,
      gain: 0.1,
      lowpassFrom: 1400,
      lowpassTo: 600,
    },
    {
      type: "sine",
      frequency: 1046.5,
      frequencyTo: 1041,
      startAt: 0.4,
      duration: 0.75,
      gain: 0.17,
      lowpassFrom: 8000,
      lowpassTo: 2400,
    },
    {
      type: "sine",
      frequency: 1318.51,
      frequencyTo: 1312,
      startAt: 0.4,
      duration: 0.75,
      gain: 0.15,
      pan: 0.1,
      lowpassFrom: 8200,
      lowpassTo: 2600,
    },
    {
      type: "sine",
      frequency: 1568,
      frequencyTo: 1560,
      startAt: 0.4,
      duration: 0.8,
      gain: 0.17,
      pan: -0.08,
      lowpassFrom: 8400,
      lowpassTo: 2800,
    },
    {
      type: "sine",
      frequency: 2093,
      frequencyTo: 2082,
      startAt: 0.4,
      duration: 0.5,
      gain: 0.05,
      lowpassFrom: 11000,
      lowpassTo: 4200,
    },
  ],
};

// The gentlest arrival: no strikes at all, just a C-major spread (C4-G4-E5-C5)
// swelling in over a third of a second and fading like a warm light coming up.
const DONE_GLOW_SCORE: SoundScore = {
  tones: [
    {
      type: "sine",
      frequency: 261.63,
      attack: 0.12,
      startAt: 0,
      duration: 0.95,
      gain: 0.16,
      lowpassFrom: 1600,
      lowpassTo: 700,
    },
    {
      type: "sine",
      frequency: 392,
      attack: 0.12,
      startAt: 0,
      duration: 0.95,
      gain: 0.12,
      lowpassFrom: 2200,
      lowpassTo: 900,
    },
    {
      type: "sine",
      frequency: 659.26,
      attack: 0.25,
      startAt: 0,
      duration: 0.8,
      gain: 0.08,
      pan: 0.1,
      lowpassFrom: 3200,
      lowpassTo: 1300,
    },
    {
      type: "sine",
      frequency: 523.25,
      attack: 0.3,
      startAt: 0,
      duration: 0.75,
      gain: 0.07,
      pan: -0.08,
      lowpassFrom: 2800,
      lowpassTo: 1100,
    },
  ],
};

// ---- Needs input ----------------------------------------------------------

// Two quick pops, A5 -> D6: drier and much shorter than "done" so a busy
// session never confuses them — contour alone tells you which happened.
const NEEDS_INPUT_POPS_SCORE: SoundScore = {
  tones: [
    {
      type: "sine",
      frequency: 880,
      frequencyTo: 868.6,
      startAt: 0,
      duration: 0.085,
      gain: 0.4,
      pan: -0.1,
      lowpassFrom: 5200,
      lowpassTo: 2400,
    },
    {
      type: "sine",
      frequency: 1760,
      frequencyTo: 1737,
      startAt: 0,
      duration: 0.05,
      gain: 0.075,
      pan: -0.1,
    },
    {
      type: "sine",
      frequency: 1174.66,
      frequencyTo: 1159.4,
      startAt: 0.125,
      duration: 0.16,
      gain: 0.44,
      pan: 0.12,
      lowpassFrom: 5600,
      lowpassTo: 2600,
    },
    {
      type: "sine",
      frequency: 2349.32,
      frequencyTo: 2319,
      startAt: 0.125,
      duration: 0.06,
      gain: 0.07,
      pan: 0.12,
    },
  ],
};

// A friendly double knuckle-rap on wood at G4 — same two-hit rhythm as pops
// but lower, warmer, unmistakably "come look at this".
const NEEDS_INPUT_KNOCK_SCORE: SoundScore = {
  tones: [
    {
      type: "triangle",
      frequency: 392,
      frequencyTo: 386,
      startAt: 0,
      duration: 0.11,
      gain: 0.36,
      lowpassFrom: 1800,
      lowpassTo: 650,
    },
    { type: "sine", frequency: 196, frequencyTo: 192, startAt: 0, duration: 0.1, gain: 0.16 },
    {
      type: "triangle",
      frequency: 392,
      frequencyTo: 385,
      startAt: 0.15,
      duration: 0.16,
      gain: 0.44,
      lowpassFrom: 1700,
      lowpassTo: 550,
    },
    { type: "sine", frequency: 196, frequencyTo: 190, startAt: 0.15, duration: 0.15, gain: 0.18 },
  ],
};

// One glass ping on E6 answered by a fainter echo of itself — the polite
// option; it asks without knocking.
const NEEDS_INPUT_PING_SCORE: SoundScore = {
  tones: [
    {
      type: "sine",
      frequency: 1318.51,
      frequencyTo: 1305,
      startAt: 0,
      duration: 0.3,
      gain: 0.34,
      pan: -0.08,
      lowpassFrom: 8000,
      lowpassTo: 2600,
    },
    { type: "sine", frequency: 2637.02, startAt: 0, duration: 0.12, gain: 0.06, pan: -0.08 },
    {
      type: "sine",
      frequency: 1318.51,
      frequencyTo: 1307,
      startAt: 0.18,
      duration: 0.4,
      gain: 0.14,
      pan: 0.1,
      lowpassFrom: 7000,
      lowpassTo: 2400,
    },
  ],
};

// ---- Error ----------------------------------------------------------------

// A muted wooden descent, E4 -> C4: triangle waves behind a tight lowpass
// read as wood, not buzzer, the sub-octave sines give the knocks weight
// without raising volume, and each strike sags flat like real wood does.
const ERROR_WOOD_SCORE: SoundScore = {
  tones: [
    {
      type: "triangle",
      frequency: 329.63,
      frequencyTo: 314.8,
      startAt: 0,
      duration: 0.18,
      gain: 0.38,
      lowpassFrom: 1100,
      lowpassTo: 430,
    },
    { type: "sine", frequency: 164.81, frequencyTo: 158.2, startAt: 0, duration: 0.17, gain: 0.2 },
    {
      type: "triangle",
      frequency: 261.63,
      frequencyTo: 248.5,
      startAt: 0.13,
      duration: 0.32,
      gain: 0.4,
      lowpassFrom: 1000,
      lowpassTo: 380,
    },
    {
      type: "sine",
      frequency: 130.81,
      frequencyTo: 124.3,
      startAt: 0.13,
      duration: 0.3,
      gain: 0.22,
    },
  ],
};

// One soft leather thump, E3 falling away under a whisper of noise — states
// the problem once, without drama.
const ERROR_THUD_SCORE: SoundScore = {
  space: 0.5,
  tones: [
    {
      type: "sine",
      frequency: 164.81,
      frequencyTo: 150,
      startAt: 0,
      duration: 0.28,
      gain: 0.42,
      lowpassFrom: 500,
      lowpassTo: 180,
    },
  ],
  noise: { startAt: 0, duration: 0.03, gain: 0.18, lowpassFrom: 900, lowpassTo: 250 },
};

// A three-step minor descent, A4 -> F4 -> D4 with quiet roots beneath — reads
// as "something went wrong" in a calm voice rather than a scolding.
const ERROR_DESCEND_SCORE: SoundScore = {
  tones: [
    {
      type: "triangle",
      frequency: 440,
      frequencyTo: 433,
      startAt: 0,
      duration: 0.14,
      gain: 0.34,
      lowpassFrom: 1600,
      lowpassTo: 700,
    },
    { type: "sine", frequency: 220, frequencyTo: 217, startAt: 0, duration: 0.13, gain: 0.12 },
    {
      type: "triangle",
      frequency: 349.23,
      frequencyTo: 343,
      startAt: 0.14,
      duration: 0.14,
      gain: 0.36,
      lowpassFrom: 1400,
      lowpassTo: 600,
    },
    {
      type: "sine",
      frequency: 174.61,
      frequencyTo: 171,
      startAt: 0.14,
      duration: 0.13,
      gain: 0.12,
    },
    {
      type: "triangle",
      frequency: 293.66,
      frequencyTo: 286,
      startAt: 0.28,
      duration: 0.3,
      gain: 0.4,
      lowpassFrom: 1200,
      lowpassTo: 450,
    },
    {
      type: "sine",
      frequency: 146.83,
      frequencyTo: 142,
      startAt: 0.28,
      duration: 0.28,
      gain: 0.14,
    },
  ],
};

// ---- Click ----------------------------------------------------------------
// All clicks are nearly dry: they happen under your finger, not in a room.

// A ~10ms filtered tick with a whisper of 2.3kHz body falling away mid-tick —
// felt more than heard, closer to a key travel than a beep.
const CLICK_TICK_SCORE: SoundScore = {
  space: 0.25,
  tones: [
    { type: "sine", frequency: 2300, frequencyTo: 1850, startAt: 0, duration: 0.006, gain: 0.18 },
  ],
  noise: { startAt: 0, duration: 0.01, gain: 0.33, lowpassFrom: 4200, lowpassTo: 900 },
};

// Lower and woodier than the tick — a fingertip tap on a desk edge.
const CLICK_TAP_SCORE: SoundScore = {
  space: 0.25,
  tones: [
    {
      type: "triangle",
      frequency: 1150,
      frequencyTo: 980,
      startAt: 0,
      duration: 0.007,
      gain: 0.16,
    },
  ],
  noise: { startAt: 0, duration: 0.01, gain: 0.3, lowpassFrom: 2600, lowpassTo: 700 },
};

// A tiny upward chirp, the bubble-pop: pitch rises instead of falls, so it
// reads as cute rather than mechanical.
const CLICK_POP_SCORE: SoundScore = {
  space: 0.25,
  tones: [
    { type: "sine", frequency: 620, frequencyTo: 940, startAt: 0, duration: 0.018, gain: 0.2 },
  ],
  noise: { startAt: 0, duration: 0.006, gain: 0.15, lowpassFrom: 3000, lowpassTo: 1200 },
};

// ---- Switches -------------------------------------------------------------
// Each variant names a pair: flipping on is brighter, off darker, so the state
// change stays audible without looking.

const SWITCH_CRISP_ON_SCORE: SoundScore = {
  space: 0.3,
  tones: [
    { type: "sine", frequency: 2600, frequencyTo: 2150, startAt: 0, duration: 0.005, gain: 0.15 },
  ],
  noise: { startAt: 0, duration: 0.009, gain: 0.3, lowpassFrom: 4800, lowpassTo: 1400 },
};

const SWITCH_CRISP_OFF_SCORE: SoundScore = {
  space: 0.3,
  tones: [
    { type: "sine", frequency: 1400, frequencyTo: 1170, startAt: 0, duration: 0.006, gain: 0.15 },
  ],
  noise: { startAt: 0, duration: 0.01, gain: 0.3, lowpassFrom: 3000, lowpassTo: 800 },
};

const SWITCH_SOFT_ON_SCORE: SoundScore = {
  space: 0.3,
  tones: [
    { type: "sine", frequency: 1900, frequencyTo: 1650, startAt: 0, duration: 0.006, gain: 0.12 },
  ],
  noise: { startAt: 0, duration: 0.008, gain: 0.22, lowpassFrom: 3200, lowpassTo: 1100 },
};

const SWITCH_SOFT_OFF_SCORE: SoundScore = {
  space: 0.3,
  tones: [
    { type: "sine", frequency: 1100, frequencyTo: 950, startAt: 0, duration: 0.007, gain: 0.12 },
  ],
  noise: { startAt: 0, duration: 0.009, gain: 0.22, lowpassFrom: 2400, lowpassTo: 700 },
};

// Mechanical-switch chunky: longer noise burst and a triangle body, the
// sound of a keycap bottoming out.
const SWITCH_CHUNKY_ON_SCORE: SoundScore = {
  space: 0.3,
  tones: [
    {
      type: "triangle",
      frequency: 1450,
      frequencyTo: 1250,
      startAt: 0,
      duration: 0.01,
      gain: 0.18,
    },
  ],
  noise: { startAt: 0, duration: 0.014, gain: 0.38, lowpassFrom: 3600, lowpassTo: 800 },
};

const SWITCH_CHUNKY_OFF_SCORE: SoundScore = {
  space: 0.3,
  tones: [
    { type: "triangle", frequency: 900, frequencyTo: 760, startAt: 0, duration: 0.012, gain: 0.18 },
  ],
  noise: { startAt: 0, duration: 0.015, gain: 0.38, lowpassFrom: 2600, lowpassTo: 600 },
};

// ---- Copy -----------------------------------------------------------------

// A single soft pickup blip, E5 with its fifth — one note only, so it never
// competes with the two-note attention sounds.
const COPY_BLIP_SCORE: SoundScore = {
  tones: [
    {
      type: "sine",
      frequency: 659.26,
      frequencyTo: 648,
      startAt: 0,
      duration: 0.08,
      gain: 0.32,
      lowpassFrom: 5000,
      lowpassTo: 2000,
    },
    { type: "sine", frequency: 987.77, frequencyTo: 972, startAt: 0, duration: 0.05, gain: 0.075 },
  ],
};

// The water-droplet read: two quick upward chirps, big drop then small —
// instantly recognizable as "picked something up".
const COPY_DROP_SCORE: SoundScore = {
  tones: [
    {
      type: "sine",
      frequency: 660,
      frequencyTo: 1320,
      startAt: 0,
      duration: 0.09,
      gain: 0.3,
      lowpassFrom: 6000,
      lowpassTo: 3500,
    },
    {
      type: "sine",
      frequency: 880,
      frequencyTo: 1760,
      startAt: 0.1,
      duration: 0.08,
      gain: 0.16,
      lowpassFrom: 6500,
      lowpassTo: 4000,
    },
  ],
};

// Two bird-quick notes a third apart, E6 then G6 — bright and weightless.
const COPY_CHIRP_SCORE: SoundScore = {
  tones: [
    {
      type: "sine",
      frequency: 1318.51,
      frequencyTo: 1305,
      startAt: 0,
      duration: 0.06,
      gain: 0.26,
      pan: -0.06,
      lowpassFrom: 8000,
      lowpassTo: 3200,
    },
    {
      type: "sine",
      frequency: 1568,
      frequencyTo: 1552,
      startAt: 0.08,
      duration: 0.09,
      gain: 0.28,
      pan: 0.07,
      lowpassFrom: 8200,
      lowpassTo: 3400,
    },
  ],
};

// ---- Sent -----------------------------------------------------------------

// The send whoosh: a breath of noise that brightens as it leaves, grounded by
// a soft G4 body inflecting up a whole step — an upward lilt, not a slide.
const SENT_WHOOSH_SCORE: SoundScore = {
  space: 0.55,
  tones: [
    { type: "sine", frequency: 392, frequencyTo: 440, startAt: 0, duration: 0.1, gain: 0.15 },
  ],
  noise: { startAt: 0, duration: 0.09, gain: 0.24, lowpassFrom: 700, lowpassTo: 2900 },
};

// A harp pluck: G4 with its octave and fifth decaying behind it — the quiet,
// confident option for a message leaving.
const SENT_PLUCK_SCORE: SoundScore = {
  space: 0.5,
  tones: [
    {
      type: "sine",
      frequency: 392,
      frequencyTo: 386,
      startAt: 0,
      duration: 0.3,
      gain: 0.3,
      lowpassFrom: 4000,
      lowpassTo: 1000,
    },
    { type: "sine", frequency: 784, frequencyTo: 772, startAt: 0, duration: 0.18, gain: 0.08 },
    { type: "sine", frequency: 587.33, frequencyTo: 578, startAt: 0, duration: 0.15, gain: 0.07 },
  ],
};

// Two rising notes, A4 -> D5 — a small "off it goes".
const SENT_ASCEND_SCORE: SoundScore = {
  space: 0.5,
  tones: [
    {
      type: "sine",
      frequency: 440,
      frequencyTo: 435,
      startAt: 0,
      duration: 0.1,
      gain: 0.26,
      pan: -0.06,
      lowpassFrom: 5000,
      lowpassTo: 2400,
    },
    {
      type: "sine",
      frequency: 587.33,
      frequencyTo: 580,
      startAt: 0.1,
      duration: 0.22,
      gain: 0.3,
      pan: 0.07,
      lowpassFrom: 5200,
      lowpassTo: 2600,
    },
  ],
};

/**
 * Every flavor a user can pick per event, first entry the default. Variants
 * within an event keep one identity — the moment's meaning never changes,
 * only its instrument and contour.
 */
export interface SoundVariant {
  readonly id: string;
  readonly label: string;
  readonly score: SoundScore;
}

export const SOUND_VARIANTS: Readonly<Record<SoundEventId, ReadonlyArray<SoundVariant>>> = {
  done: [
    { id: "chime", label: "Chime", score: DONE_CHIME_SCORE },
    { id: "bells", label: "Bells", score: DONE_BELLS_SCORE },
    { id: "level-up", label: "Level up", score: DONE_LEVEL_UP_SCORE },
    { id: "glow", label: "Glow", score: DONE_GLOW_SCORE },
  ],
  "needs-input": [
    { id: "pops", label: "Pops", score: NEEDS_INPUT_POPS_SCORE },
    { id: "knock", label: "Knock", score: NEEDS_INPUT_KNOCK_SCORE },
    { id: "ping", label: "Ping", score: NEEDS_INPUT_PING_SCORE },
  ],
  error: [
    { id: "wood", label: "Wood", score: ERROR_WOOD_SCORE },
    { id: "thud", label: "Thud", score: ERROR_THUD_SCORE },
    { id: "descend", label: "Descend", score: ERROR_DESCEND_SCORE },
  ],
  click: [
    { id: "tick", label: "Tick", score: CLICK_TICK_SCORE },
    { id: "tap", label: "Tap", score: CLICK_TAP_SCORE },
    { id: "pop", label: "Pop", score: CLICK_POP_SCORE },
  ],
  "switch-on": [
    { id: "crisp", label: "Crisp", score: SWITCH_CRISP_ON_SCORE },
    { id: "soft", label: "Soft", score: SWITCH_SOFT_ON_SCORE },
    { id: "chunky", label: "Chunky", score: SWITCH_CHUNKY_ON_SCORE },
  ],
  "switch-off": [
    { id: "crisp", label: "Crisp", score: SWITCH_CRISP_OFF_SCORE },
    { id: "soft", label: "Soft", score: SWITCH_SOFT_OFF_SCORE },
    { id: "chunky", label: "Chunky", score: SWITCH_CHUNKY_OFF_SCORE },
  ],
  copy: [
    { id: "blip", label: "Blip", score: COPY_BLIP_SCORE },
    { id: "drop", label: "Drop", score: COPY_DROP_SCORE },
    { id: "chirp", label: "Chirp", score: COPY_CHIRP_SCORE },
  ],
  sent: [
    { id: "whoosh", label: "Whoosh", score: SENT_WHOOSH_SCORE },
    { id: "pluck", label: "Pluck", score: SENT_PLUCK_SCORE },
    { id: "ascend", label: "Ascend", score: SENT_ASCEND_SCORE },
  ],
};

/**
 * The score for an event's chosen variant. Unknown or missing ids resolve to
 * the default, so corrupt storage or a renamed variant can only ever fall
 * back to sounding right, never to silence or a crash.
 */
export function resolveSoundScore(event: SoundEventId, variantId: string | undefined): SoundScore {
  const variants = SOUND_VARIANTS[event];
  return (
    variants.find((variant) => variant.id === variantId)?.score ??
    variants[0]?.score ??
    DONE_CHIME_SCORE
  );
}

/**
 * Plays synthesized UI effects through a lazily-created AudioContext. All
 * scheduling happens on the audio thread; play() never blocks or repaints
 * anything. The context is created suspended until unlock() runs from a
 * user gesture (browser autoplay policy), after which every call is
 * fire-and-forget.
 */
export class SoundPlayer {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private reverbIn: AudioNode | null = null;
  private volume = 1;

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.master !== null) this.master.gain.value = volume;
  }

  /**
   * Creates (or resumes) the audio context. Call from any real user gesture
   * — pointerdown anywhere is enough — before sounds are expected to be
   * audible.
   */
  async unlock(): Promise<void> {
    let context: AudioContext;
    try {
      context = this.ensureContext();
    } catch {
      // No Web Audio here either; silence stays the correct fallback.
      return;
    }
    if (context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        // Still suspended: plays stay silent until a later gesture retries.
      }
    }
  }

  play(score: SoundScore, options: { detuneCents?: number } = {}): void {
    if (this.volume <= 0) return;
    let context: AudioContext;
    try {
      context = this.ensureContext();
    } catch {
      // No Web Audio in this environment; silence is the correct fallback.
      return;
    }
    const master = this.master;
    if (master === null) return;
    if (context.state === "suspended") void context.resume();

    // One bus per play carries the dry signal plus its reverb send, so
    // concurrent effects can sit at different depths; the bus releases once
    // its last voice ends rather than leaking a node pair per press.
    const bus = context.createGain();
    bus.connect(master);
    const send = context.createGain();
    send.gain.value = (score.space ?? 1) * WET_GAIN;
    bus.connect(send);
    send.connect(this.ensureReverb(context));
    let live = score.tones.length + (score.noise ? 1 : 0);
    const release = (): void => {
      live -= 1;
      if (live === 0) {
        bus.disconnect();
        send.disconnect();
      }
    };

    const now = context.currentTime;
    for (const tone of score.tones) {
      this.scheduleTone(context, bus, now, tone, options.detuneCents ?? 0, release);
    }
    if (score.noise) this.scheduleNoise(context, bus, now, score.noise, release);
  }

  private ensureContext(): AudioContext {
    if (this.context !== null && this.context.state !== "closed") return this.context;
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = this.volume;
    // A gentle limiter keeps stacked effects from clipping on busy moments.
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 0;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.08;
    master.connect(limiter);
    limiter.connect(context.destination);
    this.context = context;
    this.master = master;
    this.noiseBuffer = null;
    this.reverbIn = null;
    return context;
  }

  /**
   * The shared reverb tail, built once per context: a generated small-room
   * impulse through a dampening lowpass so reflections read as air, not hiss,
   * behind a short predelay that keeps the dry transient in front of the room.
   */
  private ensureReverb(context: AudioContext): AudioNode {
    if (this.reverbIn !== null && this.context === context) return this.reverbIn;
    const impulse = context.createBuffer(
      2,
      Math.ceil(context.sampleRate * 0.4),
      context.sampleRate,
    );
    fillReverbImpulse(impulse.getChannelData(0), 0x9e3779b9);
    fillReverbImpulse(impulse.getChannelData(1), 0x85ebca6b);
    const predelay = context.createDelay(0.05);
    predelay.delayTime.value = 0.012;
    const convolver = context.createConvolver();
    convolver.buffer = impulse;
    const damping = context.createBiquadFilter();
    damping.type = "lowpass";
    damping.frequency.value = 4800;
    predelay.connect(convolver);
    convolver.connect(damping);
    if (this.master !== null) damping.connect(this.master);
    this.reverbIn = predelay;
    return predelay;
  }

  private scheduleTone(
    context: AudioContext,
    bus: GainNode,
    now: number,
    tone: ToneSpec,
    detuneCents: number,
    release: () => void,
  ): void {
    const oscillator = context.createOscillator();
    oscillator.type = tone.type;
    const start = now + tone.startAt;
    const end = start + tone.duration;
    const frequency = detuneCents === 0 ? tone.frequency : applyDetune(tone.frequency, detuneCents);
    oscillator.frequency.setValueAtTime(frequency, start);
    if (tone.frequencyTo !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(
        detuneCents === 0 ? tone.frequencyTo : applyDetune(tone.frequencyTo, detuneCents),
        end,
      );
    }

    // The chain grows only as the score asks for it; every optional stage
    // records its teardown for when the voice ends.
    const stages: Array<AudioNode> = [];
    let node: AudioNode = oscillator;
    if (tone.lowpassFrom !== undefined) {
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(tone.lowpassFrom, start);
      filter.frequency.exponentialRampToValueAtTime(tone.lowpassTo ?? tone.lowpassFrom, end);
      node.connect(filter);
      stages.push(filter);
      node = filter;
    }

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(GAIN_FLOOR, start);
    const attackSeconds = Math.min(tone.attack ?? ATTACK_SECONDS, tone.duration * 0.8);
    envelope.gain.exponentialRampToValueAtTime(tone.gain, start + attackSeconds);
    envelope.gain.exponentialRampToValueAtTime(GAIN_FLOOR, end);
    node.connect(envelope);

    let sink: AudioNode = bus;
    if (
      tone.pan !== undefined &&
      tone.pan !== 0 &&
      typeof context.createStereoPanner === "function"
    ) {
      const panner = context.createStereoPanner();
      panner.pan.value = tone.pan;
      sink = panner;
      stages.push(panner);
    }
    envelope.connect(sink);

    oscillator.addEventListener("ended", () => {
      envelope.disconnect();
      for (const stage of stages) stage.disconnect();
      release();
    });
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }

  private scheduleNoise(
    context: AudioContext,
    bus: GainNode,
    now: number,
    noise: NoiseSpec,
    release: () => void,
  ): void {
    if (this.noiseBuffer === null) {
      const length = Math.ceil(context.sampleRate * 0.03);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const channel = buffer.getChannelData(0);
      fillNoiseBuffer(channel);
      this.noiseBuffer = buffer;
    }
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    const start = now + noise.startAt;
    const end = start + noise.duration;
    filter.frequency.setValueAtTime(noise.lowpassFrom, start);
    filter.frequency.exponentialRampToValueAtTime(noise.lowpassTo, end);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(noise.gain, start);
    envelope.gain.exponentialRampToValueAtTime(GAIN_FLOOR, end);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(bus);
    source.addEventListener("ended", () => {
      filter.disconnect();
      envelope.disconnect();
      release();
    });
    source.start(start);
    source.stop(end + 0.01);
  }
}
