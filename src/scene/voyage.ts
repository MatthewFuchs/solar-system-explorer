// The voyage between scales: one continuous, logarithmic pull back from a plate (the solar
// system) to the plate that holds it (the stellar neighbourhood), or the same in reverse.
// Each tenfold step in distance takes the same time, so the emptiness between the planets
// and the stars takes as long as it should. Pure and three-free: the overlay drives it, and
// the scene and line work read the stage transform it produces.
import { easeInOutCubic, smoothstep } from "./viewTransition";

/** The whole voyage, either way. */
export const VOYAGE_MS = 6000;
/** A click, a key, or the wheel cuts what's left of the voyage to this. */
export const VOYAGE_SKIP_MS = 450;

/**
 * The most a single frame may advance the voyage. A stalled frame (a plate's textures and
 * shaders arriving at the swap, a slow graphics chip) pauses the voyage instead of skipping it.
 */
export const VOYAGE_MAX_STEP_MS = 250;

/**
 * The voyage's clock: progress 0..1, advanced per frame by at most `VOYAGE_MAX_STEP_MS` of
 * time; once hurried, what's left takes `VOYAGE_SKIP_MS` of real time, however slow the frames
 * (the visitor asked for the end).
 */
export interface VoyageClock {
  t: number;
  last: number;
  /** Progress per millisecond. */
  rate: number;
  hurried: boolean;
}

export function startVoyageClock(now: number): VoyageClock {
  return { t: 0, last: now, rate: 1 / VOYAGE_MS, hurried: false };
}

export function tickVoyageClock(c: VoyageClock, now: number): VoyageClock {
  const dt = Math.max(0, now - c.last);
  const step = c.hurried ? dt : Math.min(dt, VOYAGE_MAX_STEP_MS);
  return { ...c, last: now, t: Math.min(1, c.t + step * c.rate) };
}

export function hurryVoyageClock(c: VoyageClock): VoyageClock {
  return c.hurried ? c : { ...c, hurried: true, rate: (1 - c.t) / VOYAGE_SKIP_MS };
}

/** AU in one light-year. */
export const AU_PER_LY = 63241;

/**
 * How a plate is drawn mid-voyage: scaled by `s` around its anchor `a` (a point in the plate's
 * own coordinates, CSS pixels), which sits at screen point `p`; faded by `opacity`.
 */
export interface StageTransform {
  s: number;
  ax: number;
  ay: number;
  px: number;
  py: number;
  /** The bodies' fade (3D). */
  opacity: number;
  /** The line work and labels' fade: they leave early and arrive late, as text can't be read tiny or huge. */
  lines: number;
}

export const IDENTITY_STAGE: StageTransform = { s: 1, ax: 0, ay: 0, px: 0, py: 0, opacity: 1, lines: 1 };

/** A shared, mutable holder the scene reads every frame (no React re-render per frame). */
export type StageRef = { current: StageTransform };

/**
 * Where a point of a plate is drawn under a stage transform. Bodies shrink as the view pulls
 * back but never grow past their resting size: closing in from far off, a star stays a point.
 */
export function applyStage<T extends { x: number; y: number; r: number }>(p: T, stage: StageTransform): T {
  if (stage.s === 1 && stage.px === stage.ax && stage.py === stage.ay) return p;
  return { ...p, x: stage.px + (p.x - stage.ax) * stage.s, y: stage.py + (p.y - stage.ay) * stage.s, r: p.r * Math.min(1, stage.s) };
}

/** The same transform as CSS, for the line work and labels. */
export function stageCss(stage: StageTransform): string {
  return `translate(${stage.px.toFixed(2)}px, ${stage.py.toFixed(2)}px) scale(${stage.s.toPrecision(5)}) translate(${(-stage.ax).toFixed(2)}px, ${(-stage.ay).toFixed(2)}px)`;
}

/** What the voyage needs to know about its two plates. */
export interface VoyageEnds {
  /** The inner plate's centre (the Sun), in its own coordinates, and its scale. */
  inner: { x: number; y: number; auPerPx: number };
  /** The outer plate's centre (Sol, on the chart), and its scale. */
  outer: { x: number; y: number; auPerPx: number };
}

/**
 * Fraction of the voyage → fraction of the way through its log-scale range. Mostly steady
 * (equal time per tenfold step), with soft starts and stops.
 */
export function voyageProgress(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return 0.55 * k + 0.45 * easeInOutCubic(k);
}

/** The inner plate's scale at the end, when the outer plate has arrived at its own scale. */
export function endScale(ends: VoyageEnds): number {
  return ends.inner.auPerPx / ends.outer.auPerPx;
}

/** The inner plate's scale at fraction `t` of the way out: 1 down to endScale. */
export function voyageScale(t: number, ends: VoyageEnds): number {
  return Math.pow(endScale(ends), voyageProgress(t));
}

const lg = Math.log10;

/** The inner plate is gone below this scale; the outer plate is still too large above this scale (as a multiple of its own). */
const INNER_GONE = 0.006;
const INNER_FADE_FROM = 0.05;
const OUTER_GONE = 18;
const OUTER_FADE_TO = 3;

/** The inner plate's stage at scale z: it collapses into its Sun while the Sun drifts to where Sol will stand. */
export function innerStage(z: number, ends: VoyageEnds): StageTransform {
  const drift = smoothstep(0, 1, lg(z) / lg(0.02));
  return {
    s: z,
    ax: ends.inner.x,
    ay: ends.inner.y,
    px: ends.inner.x + (ends.outer.x - ends.inner.x) * drift,
    py: ends.inner.y + (ends.outer.y - ends.inner.y) * drift,
    opacity: smoothstep(lg(INNER_GONE), lg(INNER_FADE_FROM), lg(z)),
    lines: smoothstep(lg(0.22), lg(0.6), lg(z)),
  };
}

/** The outer plate's stage at (inner) scale z: its stars close in from beyond the screen's edge. */
export function outerStage(z: number, ends: VoyageEnds): StageTransform {
  const s = z / endScale(ends);
  return {
    s,
    ax: ends.outer.x,
    ay: ends.outer.y,
    px: ends.outer.x,
    py: ends.outer.y,
    opacity: 1 - smoothstep(lg(OUTER_FADE_TO), lg(OUTER_GONE), lg(s)),
    lines: 1 - smoothstep(lg(1.03), lg(1.8), lg(s)),
  };
}

/** The scale at which the plates swap: halfway (in log terms) through the empty stretch, when neither shows. */
export function swapScale(ends: VoyageEnds): number {
  return Math.sqrt(INNER_GONE * OUTER_GONE * endScale(ends));
}

/** Sol, the lone point of light while neither plate shows: where it is, and how bright. */
export function solPoint(z: number, ends: VoyageEnds): { x: number; y: number; opacity: number } {
  const inner = innerStage(z, ends);
  const outer = outerStage(z, ends);
  return { x: inner.px, y: inner.py, opacity: Math.max(0, 1 - inner.opacity - outer.opacity) };
}

/** A distance on the inner plate's scale (AU) as a radius on screen at scale z. */
export function ringRadius(au: number, z: number, ends: VoyageEnds): number {
  return (au / ends.inner.auPerPx) * z;
}

/** A ring shows while it's between a small circle and just past the screen's edge. */
export function ringOpacity(r: number, screen: number): number {
  return smoothstep(18, 70, r) * (1 - smoothstep(screen * 0.75, screen * 1.05, r));
}

/** "340 AU", "12,000 AU", "1.6 light-years", "47,000 light-years". */
export function formatSpan(au: number): string {
  if (au < 0.25 * AU_PER_LY) {
    const rounded = au < 1000 ? Math.round(au / 10) * 10 : Math.round(au / 1000) * 1000;
    return `${rounded.toLocaleString("en-US")} AU`;
  }
  const ly = au / AU_PER_LY;
  if (ly < 10) return `${ly.toFixed(1)} light-years`;
  if (ly < 1000) return `${Math.round(ly)} light-years`;
  // Two figures are plenty across a galaxy: "47,000", not "46,873".
  const step = 10 ** (Math.floor(Math.log10(ly)) - 1);
  return `${(Math.round(ly / step) * step).toLocaleString("en-US")} light-years`;
}
