// Ambient sound, generated live with Web Audio: a low drone on open fifths, a slow filter
// sweep, a faint high shimmer, and a synthetic reverb. Nothing is downloaded or recorded.
// Off by default; it can only start from a user gesture, so enable() is called directly
// from the toggle's click handler.

/** Overall level when on. Deliberately quiet: it should sit under attention. */
const LEVEL = 0.32;

interface Graph {
  ctx: AudioContext;
  master: GainNode;
}

/** A decaying burst of stereo noise: the shape of a large, dark room. */
function impulseResponse(ctx: AudioContext, seconds: number, decay: number) {
  const length = Math.round(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return buffer;
}

function build(): Graph {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulseResponse(ctx, 5, 2.6);
  const wet = ctx.createGain();
  wet.gain.value = 0.75;
  const dry = ctx.createGain();
  dry.gain.value = 0.4;
  reverb.connect(wet).connect(master);
  dry.connect(master);

  // The drone, through a lowpass whose cutoff drifts on a very slow LFO.
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 650;
  filter.Q.value = 0.6;
  filter.connect(dry);
  filter.connect(reverb);
  const sweep = ctx.createOscillator();
  sweep.frequency.value = 0.025;
  const sweepDepth = ctx.createGain();
  sweepDepth.gain.value = 260;
  sweep.connect(sweepDepth).connect(filter.frequency);
  sweep.start();

  const voices: [number, number, OscillatorType][] = [
    [55, 0.22, "sine"], // A1
    [82.41, 0.13, "sine"], // E2
    [110, 0.09, "triangle"], // A2
    [110.35, 0.07, "triangle"], // A2, detuned for a slow beat
    [164.81, 0.045, "sine"], // E3
  ];
  for (const [freq, gain, type] of voices) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    osc.connect(g).connect(filter);
    osc.start();
  }

  // Shimmer: two quiet high tones that swell and fade on their own slow cycles.
  for (const [freq, rate] of [
    [880, 0.05],
    [1318.5, 0.035],
  ]) {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 0.006;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const depth = ctx.createGain();
    depth.gain.value = 0.006;
    lfo.connect(depth).connect(g.gain);
    osc.connect(g).connect(reverb);
    osc.start();
    lfo.start();
  }

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
    master.gain.setTargetAtTime(LEVEL, ctx.currentTime, 1.2);
  }

  disable() {
    if (!this.graph) return;
    const { ctx, master } = this.graph;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
    // Let the fade finish, then stop the audio thread entirely.
    this.suspendTimer = window.setTimeout(() => void ctx.suspend(), 2000);
  }

  dispose() {
    window.clearTimeout(this.suspendTimer);
    void this.graph?.ctx.close();
    this.graph = null;
  }
}
