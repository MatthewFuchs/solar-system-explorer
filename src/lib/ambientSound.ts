// Ambient sound, generated live with Web Audio. Calm and spacious: a soft, open chord
// whose tones swell and fade on their own slow cycles, spread across the stereo field,
// over a faint breath of filtered air, with only a little dark reverb. Nothing is
// downloaded or recorded. Off by default; it can only start from a user gesture, so
// enable() is called directly from the toggle's click handler.

/** Overall level when on. Deliberately quiet: it should sit under attention. */
const LEVEL = 0.24;
/** Seconds to fade in or out (time constant; a full fade takes about three times this). */
const FADE_IN = 2.5;
const FADE_OUT = 0.6;

/**
 * An open D major add-nine chord, voiced high enough to float rather than rumble.
 * Each tone: frequency, level, stereo position, and how many seconds one swell takes.
 */
const VOICES: [freq: number, gain: number, pan: number, swell: number][] = [
  [146.83, 0.07, -0.15, 41], // D3
  [220.0, 0.055, 0.35, 29], // A3
  [329.63, 0.04, -0.45, 37], // E4
  [369.99, 0.03, 0.55, 53], // F#4
  [587.33, 0.012, -0.25, 23], // D5, a faint glint above
];

interface Graph {
  ctx: AudioContext;
  master: GainNode;
}

/** A short, soft tail of stereo noise: just enough room for the tones to breathe. */
function impulseResponse(ctx: AudioContext, seconds: number, decay: number) {
  const length = Math.round(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return buffer;
}

/** A few seconds of soft, pink-ish noise to loop as the "air" under the chord. */
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
function lfo(ctx: AudioContext, param: AudioParam, seconds: number, depth: number, phase = 0) {
  const osc = ctx.createOscillator();
  osc.frequency.value = 1 / seconds;
  const g = ctx.createGain();
  g.gain.value = depth;
  osc.connect(g).connect(param);
  osc.start(ctx.currentTime + phase);
}

function build(): Graph {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;

  // A gentle top-end roll-off keeps everything soft.
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 2400;
  tone.Q.value = 0.5;
  master.connect(tone).connect(ctx.destination);

  // Mostly dry, with a little short, dark reverb.
  const dry = ctx.createGain();
  dry.gain.value = 0.85;
  dry.connect(master);
  const reverbIn = ctx.createBiquadFilter();
  reverbIn.type = "lowpass";
  reverbIn.frequency.value = 1400;
  const reverb = ctx.createConvolver();
  reverb.buffer = impulseResponse(ctx, 2.6, 3.2);
  const wet = ctx.createGain();
  wet.gain.value = 0.18;
  reverbIn.connect(reverb).connect(wet).connect(master);

  const bus = ctx.createGain();
  bus.connect(dry);
  bus.connect(reverbIn);

  VOICES.forEach(([freq, gain, pan, swell], i) => {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(bus);
    const level = ctx.createGain();
    // Each tone breathes between near-silence and its full level on its own cycle.
    level.gain.value = gain * 0.55;
    lfo(ctx, level.gain, swell, gain * 0.45, i * 3.1);
    level.connect(panner);
    // Two oscillators a fraction of a hertz apart: a slow, soft shimmer, not a buzz.
    for (const detune of [-0.18, 0.18]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq + detune;
      osc.connect(level);
      osc.start();
    }
  });

  // The air: soft noise through a wide band, swelling slowly.
  const air = ctx.createBufferSource();
  air.buffer = airBuffer(ctx, 6);
  air.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 700;
  band.Q.value = 0.35;
  const airLevel = ctx.createGain();
  airLevel.gain.value = 0.05;
  lfo(ctx, airLevel.gain, 47, 0.03);
  lfo(ctx, band.frequency, 61, 250);
  air.connect(band).connect(airLevel).connect(bus);
  air.start();

  return { ctx, master };
}

export class AmbientSound {
  private graph: Graph | null = null;
  private suspendTimer = 0;

  /** Must be called from a user gesture (a click), so the browser allows audio. */
  enable() {
    window.clearTimeout(this.suspendTimer);
    if (!this.graph) this.graph = build();
    const { ctx, master } = this.graph;
    void ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(LEVEL, ctx.currentTime, FADE_IN);
  }

  disable() {
    if (!this.graph) return;
    const { ctx, master } = this.graph;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, FADE_OUT);
    // Let the fade finish, then stop the audio thread entirely.
    this.suspendTimer = window.setTimeout(() => void ctx.suspend(), FADE_OUT * 5000);
  }

  dispose() {
    window.clearTimeout(this.suspendTimer);
    void this.graph?.ctx.close();
    this.graph = null;
  }
}
