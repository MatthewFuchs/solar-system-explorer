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
  opacity: number;
}

export const IDENTITY_STAGE: StageTransform = { s: 1, ax: 0, ay: 0, px: 0, py: 0, opacity: 1 };

/** A shared, mutable holder the scene reads every frame (no React re-render per frame). */
export type StageRef = { current: StageTransform };

/** Where a point of a plate is drawn under a stage transform. */
export function applyStage<T extends { x: number; y: number; r: number }>(p: T, stage: StageTransform): T {
  if (stage.s === 1 && stage.px === stage.ax && stage.py === stage.ay) return p;
  return { ...p, x: stage.px + (p.x - stage.ax) * stage.s, y: stage.py + (p.y - stage.ay) * stage.s, r: p.r * stage.s };
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
