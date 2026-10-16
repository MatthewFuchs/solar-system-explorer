// Shared timing and geometry for the overview ⇄ planet view transition.
// One Timeline drives the 3D scene; the DOM typography runs Web Animations with
// the same duration and an equivalent CSS curve, so both move together.
import type { Vector3 } from "three";

/** The signature zoom between overview and planet view. */
export const ZOOM_MS = 1500;
/** Turning the planet to face a point of interest. */
export const TURN_MS = 1100;
/** CSS twin of easeInOutCubic, for Web Animations and CSS. */
export const ZOOM_EASING_CSS = "cubic-bezier(0.65, 0, 0.35, 1)";

const DEG = Math.PI / 180;

export function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Linear progress between 0 and 1, read through an ease. Reversing mid-way
 * travels back over the same curve in the time already spent, which matches
 * `Animation.reverse()` in the Web Animations API.
 */
export class Timeline {
  private from: number;
  private to: number;
  private start = 0;
  private span = 0;

  constructor(initial: number) {
    this.from = initial;
    this.to = initial;
  }

  progress(now: number) {
    if (this.span <= 0) return this.to;
    const k = Math.min(1, (now - this.start) / this.span);
    return this.from + (this.to - this.from) * k;
  }

  value(now: number) {
    return easeInOutCubic(this.progress(now));
  }

  /** Head toward `to`; a full 0→1 run takes `duration` ms. */
  play(to: number, duration: number, now: number) {
    const p = this.progress(now);
    this.from = p;
    this.to = to;
    this.start = now;
    this.span = Math.abs(to - p) * duration;
  }

  remaining(now: number) {
    return Math.max(0, this.start + this.span - now);
  }

  done(now: number) {
    return now >= this.start + this.span;
  }
}

export interface Placement {
  x: number;
  y: number;
  r: number;
}

/** The focused planet's overview placement and its planet-view placement. */
export interface ZoomFrame {
  from: Placement;
  to: Placement;
}

/**
 * Where a body sits at zoom amount `e` (0 overview, 1 planet view). The focused
 * planet travels to its feature placement while everything else scales outward
 * from it, so the transition reads as flying in rather than a crossfade.
 * Scale is interpolated exponentially so the zoom feels even throughout.
 */
export function zoomPlacement(base: Placement, frame: ZoomFrame | null, e: number, isFocus: boolean): Placement {
  if (!frame || e <= 0) return base;
  const scale = Math.exp(Math.log(frame.to.r / frame.from.r) * e);
  const cx = lerp(frame.from.x, frame.to.x, e);
  const cy = lerp(frame.from.y, frame.to.y, e);
  if (isFocus) return { x: cx, y: cy, r: frame.from.r * scale };
  return { x: cx + (base.x - frame.from.x) * scale, y: cy + (base.y - frame.from.y) * scale, r: base.r * scale };
}

/**
 * Unit vector on a sphere for a latitude/longitude, in three.js SphereGeometry
 * space with an equirectangular map whose left edge is longitude -180.
 */
export function surfacePoint(lat: number, lon: number, out: Vector3) {
  const la = lat * DEG;
  const phi = (lon + 180) * DEG;
  return out.set(-Math.cos(phi) * Math.cos(la), Math.sin(la), Math.sin(phi) * Math.cos(la));
}

/**
 * Sphere rotation (x, y) that turns a surface point toward the viewer. Latitude is
 * only partly corrected so poles keep their natural lean.
 */
export function faceRotation(lat: number, lon: number): [number, number] {
  const phi = (lon + 180) * DEG;
  return [lat * DEG * 0.75, -Math.atan2(-Math.cos(phi), Math.sin(phi))];
}

/** `target` shifted by whole turns to land nearest `current`, so turns take the short way. */
export function nearestAngle(target: number, current: number) {
  const turn = Math.PI * 2;
  return target + turn * Math.round((current - target) / turn);
}
