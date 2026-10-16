// Ambient sound, generated live with Web Audio. Sparse and spacious: a faint breath of
// filtered air, and over it single soft notes that surface now and then, like distant
// signals, each fading in, lingering, and dissolving. Mostly silence. Nothing is
// downloaded or recorded. Off by default; it can only start from a user gesture, so
// enable() is called directly from the toggle's click handler.

/** Overall level when on. Deliberately quiet: it should sit under attention. */
const LEVEL = 0.3;
/** Seconds to fade in or out (time constant; a full fade takes about three times this). */
const FADE_IN = 2.5;
const FADE_OUT = 0.6;

/** D major pentatonic across two octaves: any two notes sit well together. */
const NOTES = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0];
/** Silence between notes, in seconds. */
const GAP = [5, 12] as const;
/** Note shape, in seconds: a slow swell in, a short hold, a long dissolve. */
const ATTACK = 1.8;
const HOLD = 0.6;
const RELEASE = 6;
const NOTE_LEVEL = 0.05;

interface Graph {
  ctx: AudioContext;
  master: GainNode;
  /** Where notes enter: through the echo and a little reverb. */
  notes: GainNode;
}

/** A short, soft tail of stereo noise: just enough room for the notes to breathe. */
function impulseResponse(ctx: AudioContext, seconds: number, decay: number) {
  const length = Math.round(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return buffer;
}

/** A few seconds of soft, pink-ish noise to loop as the air. */
function airBuffer(ctx: AudioContext, seconds: number) {
  const length = Math.round(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      // Paul Kellet's economical pink-noise filter.
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
    }
  }
  return buffer;
}

/** A slow sine LFO driving `param` by ±depth around its current value. */
function lfo(ctx: AudioContext, param: AudioParam, seconds: number, depth: number) {
  const osc = ctx.createOscillator();
  osc.frequency.value = 1 / seconds;
  const g = ctx.createGain();
  g.gain.value = depth;
  osc.connect(g).connect(param);
  osc.start();
}

function build(): Graph {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 3200;
  tone.Q.value = 0.5;
  master.connect(tone).connect(ctx.destination);

  // The air: soft noise through a wide band, swelling slowly. Always there, barely.
  const air = ctx.createBufferSource();
  air.buffer = airBuffer(ctx, 6);
  air.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 650;
  band.Q.value = 0.35;
  const airLevel = ctx.createGain();
  airLevel.gain.value = 0.045;
  lfo(ctx, airLevel.gain, 47, 0.025);
  lfo(ctx, band.frequency, 61, 220);
  air.connect(band).connect(airLevel).connect(master);
  air.start();

  // Notes: mostly dry, with one quiet, darkened echo and a touch of short reverb.
  const notes = ctx.createGain();
  notes.connect(master);
  const echo = ctx.createDelay(2);
  echo.delayTime.value = 0.9;
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = "lowpass";
  echoTone.frequency.value = 1500;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const echoLevel = ctx.createGain();
  echoLevel.gain.value = 0.22;
  notes.connect(echo);
  echo.connect(echoTone).connect(feedback).connect(echo);
  echoTone.connect(echoLevel).connect(master);
  const reverb = ctx.createConvolver();
  reverb.buffer = impulseResponse(ctx, 2.4, 3.2);
  const wet = ctx.createGain();
  wet.gain.value = 0.15;
  notes.connect(reverb).connect(wet).connect(master);

  return { ctx, master, notes };
}

/** One note surfacing: a sine with a faint octave above it, swelling in and dissolving. */
function playNote(g: Graph, freq: number, delay = 0) {
  const { ctx, notes } = g;
  const t0 = ctx.currentTime + delay;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(NOTE_LEVEL, t0 + ATTACK);
  env.gain.setValueAtTime(NOTE_LEVEL, t0 + ATTACK + HOLD);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + ATTACK + HOLD + RELEASE);
  const pan = ctx.createStereoPanner();
  pan.pan.value = Math.random() * 1.4 - 0.7;
  env.connect(pan).connect(notes);
  const end = t0 + ATTACK + HOLD + RELEASE + 0.1;
  for (const [mult, level] of [
    [1, 1],
    [2, 0.12],
  ]) {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq * mult;
    const partial = ctx.createGain();
    partial.gain.value = level;
    osc.connect(partial).connect(env);
    osc.start(t0);
    osc.stop(end);
  }
}

const between = (min: number, max: number) => min + Math.random() * (max - min);

export class AmbientSound {
  private graph: Graph | null = null;
  private suspendTimer = 0;
  private noteTimer = 0;
  private lastNote = -1;

  /** Must be called from a user gesture (a click), so the browser allows audio. */
  enable() {
    window.clearTimeout(this.suspendTimer);
    if (!this.graph) this.graph = build();
    const { ctx, master } = this.graph;
    void ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(LEVEL, ctx.currentTime, FADE_IN);
    window.clearTimeout(this.noteTimer);
    this.noteTimer = window.setTimeout(() => this.surface(), 1500);
  }

  disable() {
    window.clearTimeout(this.noteTimer);
    if (!this.graph) return;
    const { ctx, master } = this.graph;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, FADE_OUT);
    // Let the fade finish, then stop the audio thread entirely.
    this.suspendTimer = window.setTimeout(() => void ctx.suspend(), FADE_OUT * 5000);
  }

  dispose() {
    window.clearTimeout(this.suspendTimer);
    window.clearTimeout(this.noteTimer);
    void this.graph?.ctx.close();
    this.graph = null;
  }

  /** Play a note (now and then a pair), then wait a while in silence before the next. */
  private surface() {
    const g = this.graph;
    if (!g) return;
    let i = Math.floor(Math.random() * NOTES.length);
    if (i === this.lastNote) i = (i + 2) % NOTES.length;
    this.lastNote = i;
    playNote(g, NOTES[i]);
    // Occasionally a second note answers, a little later, from elsewhere in the scale.
    if (Math.random() < 0.25) playNote(g, NOTES[(i + 3) % NOTES.length], between(1.5, 3));
    this.noteTimer = window.setTimeout(() => this.surface(), between(...GAP) * 1000);
  }
}
