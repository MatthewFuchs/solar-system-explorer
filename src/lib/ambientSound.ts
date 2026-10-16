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

// ---------- Planet songs ----------
// Clicking a world plays its song, after Kepler's Harmonices Mundi (1619): a planet's pitch
// follows its speed, rising as it swings in close to the Sun and falling as it slows at the
// far end of its orbit. The width of that glide is real, ((1 + e) / (1 - e))^2 for the
// orbit's eccentricity e, so Venus holds nearly one note, Earth sings a semitone (Kepler's
// mi-fa-mi), and Mercury and Pluto leap more than an octave. Where the song sits follows the
// mean orbital speed (Kepler's third law), compressed into a singable range and tuned to the
// ambient scale, so near worlds sing high and far ones low. The Sun answers with a low chord.

/** The ambient D major pentatonic, from D2 to D6, for tuning each song's lowest note. */
const SONG_SCALE = Array.from({ length: 5 }, (_, octave) => [0, 2, 4, 7, 9].map((s) => 73.42 * 2 ** (octave + s / 12))).flat();
/** Earth's speed maps to E4; SONG_SPREAD compresses the 10 octaves from Mercury to Pluto to about 3. */
const SONG_EARTH = 330;
const SONG_SPREAD = 0.33;
/** One orbit, played in seconds: from the far end, in close, and back out. */
const SONG_ORBIT = 3.4;
const SONG_ATTACK = 0.5;
const SONG_RELEASE = 3.5;
const SONG_LEVEL = 0.085;
/** The Sun's chord: D2, A2, D3. */
const SUN_CHORD = [73.42, 110, 146.83];

export interface SongSource {
  kind?: "star" | "planet" | "dwarf";
  distanceAU?: number;
  eccentricity?: number;
}

function nearestInScale(freq: number) {
  return SONG_SCALE.reduce((best, f) => (Math.abs(Math.log(f / freq)) < Math.abs(Math.log(best / freq)) ? f : best));
}

/** A voice: a sine with a soft octave and a whisper of the twelfth, so low songs still carry on small speakers. */
function voice(ctx: AudioContext, out: AudioNode, freq: number, t0: number, end: number) {
  const oscs = [
    [1, 1],
    [2, 0.3],
    [3, 0.06],
  ].map(([mult, level]) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq * mult;
    const partial = ctx.createGain();
    partial.gain.value = level;
    osc.connect(partial).connect(out);
    osc.start(t0);
    osc.stop(end);
    return { osc, mult };
  });
  return oscs;
}

/** Plays one body's song into the notes bus; returns its envelope so a new song can cut it short. */
function playSong(g: Graph, body: SongSource) {
  const { ctx, notes } = g;
  const t0 = ctx.currentTime + 0.02;
  const env = ctx.createGain();
  env.connect(notes);
  env.gain.setValueAtTime(0, t0);

  if (body.kind === "star" || body.distanceAU === undefined || body.eccentricity === undefined) {
    // The Sun doesn't travel, so it doesn't glide: a low chord swells and settles.
    const end = t0 + 1.2 + 1.6 + SONG_RELEASE * 1.4 + 0.1;
    env.gain.linearRampToValueAtTime(SONG_LEVEL * 0.8, t0 + 1.2);
    env.gain.setValueAtTime(SONG_LEVEL * 0.8, t0 + 2.8);
    env.gain.exponentialRampToValueAtTime(0.0001, end - 0.1);
    SUN_CHORD.forEach((f) => voice(ctx, env, f, t0, end));
    return env;
  }

  const low = nearestInScale(SONG_EARTH * body.distanceAU ** -SONG_SPREAD);
  const e = body.eccentricity;
  const ratio = ((1 + e) / (1 - e)) ** 2;
  const glideStart = t0 + SONG_ATTACK * 0.6;
  const end = glideStart + SONG_ORBIT + SONG_RELEASE + 0.1;
  env.gain.linearRampToValueAtTime(SONG_LEVEL, t0 + SONG_ATTACK);
  env.gain.setValueAtTime(SONG_LEVEL, glideStart + SONG_ORBIT * 0.75);
  env.gain.exponentialRampToValueAtTime(0.0001, end - 0.1);

  // Speed along an orbit swells and ebbs smoothly, so the pitch follows a raised cosine
  // (in log frequency) from the far end up to the near end and back.
  const steps = 64;
  for (const { osc, mult } of voice(ctx, env, low, t0, end)) {
    const curve = new Float32Array(steps);
    for (let i = 0; i < steps; i++) curve[i] = low * mult * ratio ** ((1 - Math.cos((2 * Math.PI * i) / (steps - 1))) / 2);
    osc.frequency.setValueCurveAtTime(curve, glideStart, SONG_ORBIT);
  }
  return env;
}

const between = (min: number, max: number) => min + Math.random() * (max - min);

export class AmbientSound {
  private graph: Graph | null = null;
  private suspendTimer = 0;
  private noteTimer = 0;
  private lastNote = -1;
  private on = false;
  private song: GainNode | null = null;

  /** Must be called from a user gesture (a click), so the browser allows audio. */
  enable() {
    this.on = true;
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
    this.on = false;
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

  /** Sing a body's song when it is chosen. Silent unless sound is on; a new song cuts off the last. */
  sing(body: SongSource) {
    const g = this.graph;
    if (!this.on || !g) return;
    if (this.song) {
      const { gain } = this.song;
      gain.cancelScheduledValues(g.ctx.currentTime);
      gain.setTargetAtTime(0, g.ctx.currentTime, 0.08);
    }
    this.song = playSong(g, body);
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
