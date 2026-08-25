import type { SoundEventId } from "./preferences.ts";

/**
 * A sound as data: a short stack of tones (and optionally one filtered noise
 * burst) scheduled relative to effect start. Keeping scores declarative
 * makes them tunable without touching playback code.
 */
interface ToneSpec {
  readonly type: OscillatorType;
  readonly frequency: number;
  readonly startAt: number;
  readonly duration: number;
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

// A rising perfect fourth (G5 -> C6), voiced like a soft glass marimba: each
// note carries its octave plus a fast-fading inharmonic knock, and a falling
// lowpass lets the tail darken naturally. The second note lands on the other
// side of center while the first still rings.
const DONE_SCORE: SoundScore = {
  tones: [
    { type: "sine", frequency: 783.99, startAt: 0, duration: 0.52, gain: 0.4, pan: -0.12, lowpassFrom: 6400, lowpassTo: 1500 },
    { type: "sine", frequency: 1567.98, startAt: 0, duration: 0.18, gain: 0.1, pan: -0.12, lowpassFrom: 8000, lowpassTo: 3000 },
    { type: "sine", frequency: 2352, startAt: 0, duration: 0.06, gain: 0.07, pan: -0.12 },
    { type: "sine", frequency: 1046.5, startAt: 0.1, duration: 0.64, gain: 0.44, pan: 0.14, lowpassFrom: 7200, lowpassTo: 1700 },
    { type: "sine", frequency: 2093, startAt: 0.1, duration: 0.22, gain: 0.1, pan: 0.14, lowpassFrom: 9000, lowpassTo: 3200 },
    { type: "sine", frequency: 3139.5, startAt: 0.1, duration: 0.08, gain: 0.06, pan: 0.14 },
  ],
};

// Two quick pops, A5 -> D6: drier and much shorter than "done" so a busy
// session never confuses them — contour alone tells you which happened.
const NEEDS_INPUT_SCORE: SoundScore = {
  tones: [
    { type: "sine", frequency: 880, startAt: 0, duration: 0.085, gain: 0.42, pan: -0.1, lowpassFrom: 5200, lowpassTo: 2400 },
    { type: "sine", frequency: 1760, startAt: 0, duration: 0.05, gain: 0.08, pan: -0.1 },
    { type: "sine", frequency: 1174.66, startAt: 0.125, duration: 0.15, gain: 0.44, pan: 0.12, lowpassFrom: 5600, lowpassTo: 2600 },
    { type: "sine", frequency: 2349.32, startAt: 0.125, duration: 0.06, gain: 0.07, pan: 0.12 },
  ],
};

// A muted wooden descent, E4 -> C4: triangle waves behind a tight lowpass
// read as wood, not buzzer, and the sub-octave sines underneath give the two
// knocks weight without raising their volume.
const ERROR_SCORE: SoundScore = {
  tones: [
    { type: "triangle", frequency: 329.63, startAt: 0, duration: 0.17, gain: 0.4, lowpassFrom: 1100, lowpassTo: 450 },
    { type: "sine", frequency: 164.81, startAt: 0, duration: 0.17, gain: 0.22 },
    { type: "triangle", frequency: 261.63, startAt: 0.13, duration: 0.3, gain: 0.42, lowpassFrom: 1000, lowpassTo: 400 },
    { type: "sine", frequency: 130.81, startAt: 0.13, duration: 0.28, gain: 0.24 },
  ],
};

// A ~10ms filtered tick with a whisper of 2.3kHz body — felt more than heard,
// closer to a key travel than a beep.
const CLICK_SCORE: SoundScore = {
  tones: [{ type: "sine", frequency: 2300, startAt: 0, duration: 0.006, gain: 0.18 }],
  noise: { startAt: 0, duration: 0.01, gain: 0.36, lowpassFrom: 4200, lowpassTo: 900 },
};

export const SOUND_SCORES: Readonly<Record<SoundEventId, SoundScore>> = {
  done: DONE_SCORE,
  "needs-input": NEEDS_INPUT_SCORE,
  error: ERROR_SCORE,
  click: CLICK_SCORE,
};

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
    const context = this.ensureContext();
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

    const now = context.currentTime;
    for (const tone of score.tones) {
      this.scheduleTone(context, master, now, tone, options.detuneCents ?? 0);
    }
    if (score.noise) this.scheduleNoise(context, master, now, score.noise);
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
    return context;
  }

  private scheduleTone(
    context: AudioContext,
    master: GainNode,
    now: number,
    tone: ToneSpec,
    detuneCents: number,
  ): void {
    const oscillator = context.createOscillator();
    oscillator.type = tone.type;
    const start = now + tone.startAt;
    const end = start + tone.duration;
    const frequency =
      detuneCents === 0 ? tone.frequency : applyDetune(tone.frequency, detuneCents);
    oscillator.frequency.setValueAtTime(frequency, start);

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
    envelope.gain.exponentialRampToValueAtTime(tone.gain, start + ATTACK_SECONDS);
    envelope.gain.exponentialRampToValueAtTime(GAIN_FLOOR, end);
    node.connect(envelope);

    let sink: AudioNode = master;
    if (tone.pan !== undefined && tone.pan !== 0 && typeof context.createStereoPanner === "function") {
      const panner = context.createStereoPanner();
      panner.pan.value = tone.pan;
      sink = panner;
      stages.push(panner);
    }
    envelope.connect(sink);

    oscillator.onended = () => {
      envelope.disconnect();
      for (const stage of stages) stage.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }

  private scheduleNoise(
    context: AudioContext,
    master: GainNode,
    now: number,
    noise: NoiseSpec,
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
    envelope.connect(master);
    source.onended = () => {
      filter.disconnect();
      envelope.disconnect();
    };
    source.start(start);
    source.stop(end + 0.01);
  }
}
