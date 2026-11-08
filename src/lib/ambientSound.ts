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

// ---------- Discoveries ----------
/**
 * A discovery's own voice, distinct from the ambient notes: three notes rising through the
 * scale (D5, F#5, A5), each blooming quickly rather than swelling, centred rather than drifting,
 * a little clearer, with a faint twelfth (the third partial) that gives it a bell's edge. The
 * ambient voice never sounds that partial, so a discovery always reads as itself.
 */
export const DISCOVERY_NOTES = [587.33, 739.99, 880.0] as const;
const DISCOVERY_STEP = 0.24;
const DISCOVERY_LEVEL = 0.07;
const DISCOVERY_RING = 3.2;

function playDiscovery(g: Graph) {
  const { ctx, notes } = g;
  DISCOVERY_NOTES.forEach((freq, i) => {
    const t0 = ctx.currentTime + i * DISCOVERY_STEP;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(DISCOVERY_LEVEL, t0 + 0.06);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + DISCOVERY_RING);
    env.connect(notes);
    for (const [mult, level] of [
      [1, 1],
      [2, 0.16],
      [3, 0.05],
    ]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq * mult;
      const partial = ctx.createGain();
      partial.gain.value = level;
      osc.connect(partial).connect(env);
      osc.start(t0);
      osc.stop(t0 + DISCOVERY_RING + 0.1);
    }
  });
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
  kind?: "star" | "planet" | "dwarf" | "deep-sky";
  distanceAU?: number;
  /** Another star's class: its chord is pitched by how hot it is (starChord). */
  spectralType?: string;
  eccentricity?: number;
  /** What a deep-sky object is ("Nebula", "Black hole"): it sets the object's voice. */
  mark?: string;
  name?: string;
}

function nearestInScale(freq: number) {
  return SONG_SCALE.reduce((best, f) => (Math.abs(Math.log(f / freq)) < Math.abs(Math.log(best / freq)) ? f : best));
}

/**
 * A body's song: the note it starts from (set by distance, snapped to the pentatonic) and
 * how far it glides up, Kepler's ((1+e)/(1-e))^2. Null for the Sun, which plays a chord.
 */
export function songPitch(body: SongSource): { low: number; ratio: number } | null {
  if (body.kind === "star" || body.distanceAU === undefined || body.eccentricity === undefined) return null;
  const e = body.eccentricity;
  return { low: nearestInScale(SONG_EARTH * body.distanceAU ** -SONG_SPREAD), ratio: ((1 + e) / (1 - e)) ** 2 };
}

/** Every note a song may start on: D pentatonic from D2 up five octaves. */
export const SONG_NOTES: readonly number[] = SONG_SCALE;

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

// ---------- Stars and the galaxy's landmarks ----------
// Other stars don't orbit the Sun, so they have no Kepler glide. Each sings a chord like the
// Sun's, pitched by its temperature: the hotter its spectral class, the higher it sounds. A
// G star like the Sun (Alpha Centauri, Tau Ceti) sounds the Sun's chord an octave up, as if
// from far off; cool red M dwarfs sit lower, hot white A stars (Sirius) higher.

/** Spectral classes from hottest to coolest. */
const CLASSES = "OBAFGKM";

/** A star's chord, from its class: root, the note three steps up the pentatonic, and the octave. */
export function starChord(spectralType: string): number[] | null {
  const c = CLASSES.indexOf(spectralType[0]);
  if (c < 0) return null;
  // G (the Sun's class) on D3; one pentatonic step per class.
  const root = 5 + (CLASSES.indexOf("G") - c);
  return [SONG_SCALE[root], SONG_SCALE[root + 3], SONG_SCALE[root] * 2];
}

/**
 * The galaxy's landmarks each sing after what they are:
 * - a nebula: two notes swelling slowly and fading, a cloud of sound, slightly detuned;
 * - a supernova remnant (the Crab): a note that pulses 30 times a second, the real rate of the
 *   pulsar at its heart (NASA Chandra);
 * - a globular cluster: a shimmer of many quiet notes up the scale, for its crowd of stars;
 * - a black hole: the lowest voice on the site, gliding down, as light climbing out of its
 *   gravity is stretched to longer wavelengths.
 */
function playLandmark(g: Graph, env: GainNode, body: SongSource, t0: number) {
  const { ctx } = g;
  const level = SONG_LEVEL * 0.8;
  switch (body.mark) {
    case "Black hole": {
      const end = t0 + 7.5;
      env.gain.linearRampToValueAtTime(level * 1.1, t0 + 1.4);
      env.gain.exponentialRampToValueAtTime(0.0001, end - 0.1);
      const low = SONG_SCALE[0];
      const steps = 48;
      for (const { osc, mult } of voice(ctx, env, low, t0, end)) {
        const curve = new Float32Array(steps);
        // Down a fifth, slowing as it falls.
        for (let i = 0; i < steps; i++) curve[i] = low * mult * (2 / 3) ** Math.sqrt(i / (steps - 1));
        osc.frequency.setValueCurveAtTime(curve, t0 + 0.8, 5.5);
      }
      return;
    }
    case "Supernova remnant": {
      const end = t0 + 6;
      env.gain.linearRampToValueAtTime(level, t0 + 0.6);
      env.gain.exponentialRampToValueAtTime(0.0001, end - 0.1);
      // The pulsar: 30 pulses a second, beating the note's loudness.
      const beat = ctx.createGain();
      beat.gain.value = 0.55;
      beat.connect(env);
      const pulsar = ctx.createOscillator();
      pulsar.frequency.value = 30;
      const depth = ctx.createGain();
      depth.gain.value = 0.45;
      pulsar.connect(depth).connect(beat.gain);
      pulsar.start(t0);
      pulsar.stop(end);
      voice(ctx, beat, SONG_SCALE[8], t0, end);
      return;
    }
    case "Globular cluster": {
      // Many small stars: quick, quiet notes climbing the scale, the swarm thinning upward.
      const end = t0 + 5.5;
      env.gain.setValueAtTime(level * 0.9, t0);
      env.gain.setValueAtTime(level * 0.9, t0 + 3);
      env.gain.exponentialRampToValueAtTime(0.0001, end - 0.1);
      for (let i = 0; i < 12; i++) {
        const at = t0 + i * 0.13 + (i % 3) * 0.03;
        const note = ctx.createGain();
        note.gain.setValueAtTime(0, at);
        note.gain.linearRampToValueAtTime(0.5 - i * 0.03, at + 0.03);
        note.gain.exponentialRampToValueAtTime(0.0001, at + 1.6);
        note.connect(env);
        const osc = ctx.createOscillator();
        osc.frequency.value = SONG_SCALE[10 + (i % 8)];
        osc.connect(note);
        osc.start(at);
        osc.stop(at + 1.7);
      }
      return;
    }
    default: {
      // A nebula: two notes, each a pair of voices a few cents apart, swelling slowly. Which
      // two depends on the nebula, so each has its own.
      const end = t0 + 8;
      env.gain.linearRampToValueAtTime(level * 0.9, t0 + 2.4);
      env.gain.setValueAtTime(level * 0.9, t0 + 3.6);
      env.gain.exponentialRampToValueAtTime(0.0001, end - 0.1);
      const base = 9 + ((body.name ?? "").length % 3);
      for (const step of [0, 4]) {
        for (const cents of [-5, 5]) voice(ctx, env, SONG_SCALE[base + step] * 2 ** (cents / 1200), t0, end);
      }
    }
  }
}

/** Plays one body's song into the notes bus; returns its envelope so a new song can cut it short. */
function playSong(g: Graph, body: SongSource) {
  const { ctx, notes } = g;
  const t0 = ctx.currentTime + 0.02;
  const env = ctx.createGain();
  env.connect(notes);
  env.gain.setValueAtTime(0, t0);

  if (body.kind === "deep-sky") {
    playLandmark(g, env, body, t0);
    return env;
  }
  const chord = body.spectralType ? starChord(body.spectralType) : null;
  if (chord) {
    // Another star: a chord like the Sun's, swelling and settling, a little quieter (far off).
    const end = t0 + 1.2 + 1.6 + SONG_RELEASE * 1.4 + 0.1;
    env.gain.linearRampToValueAtTime(SONG_LEVEL * 0.65, t0 + 1.2);
    env.gain.setValueAtTime(SONG_LEVEL * 0.65, t0 + 2.8);
    env.gain.exponentialRampToValueAtTime(0.0001, end - 0.1);
    chord.forEach((f) => voice(ctx, env, f, t0, end));
    return env;
  }

  const pitch = songPitch(body);
  if (!pitch) {
    // The Sun doesn't travel, so it doesn't glide: a low chord swells and settles.
    const end = t0 + 1.2 + 1.6 + SONG_RELEASE * 1.4 + 0.1;
    env.gain.linearRampToValueAtTime(SONG_LEVEL * 0.8, t0 + 1.2);
    env.gain.setValueAtTime(SONG_LEVEL * 0.8, t0 + 2.8);
    env.gain.exponentialRampToValueAtTime(0.0001, end - 0.1);
    SUN_CHORD.forEach((f) => voice(ctx, env, f, t0, end));
    return env;
  }

  const { low, ratio } = pitch;
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

  /** A discovery: its own short rising figure (playDiscovery). Silent unless sound is on. */
  chime() {
    const g = this.graph;
    if (!this.on || !g) return;
    playDiscovery(g);
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
