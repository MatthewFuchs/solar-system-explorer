// The overview is a fixed composition: the Sun as a quarter disk in the top-left
// corner, planets falling along the page diagonal on concentric partial arcs.
// Positions are art-directed, not astronomical. All values are CSS pixels, origin top-left.
import type { CelestialBody } from "../data/solarSystem";

/** Where each planet sits between the Sun's edge and the far corner (0–1). */
const ORBIT_STEPS = [0.12, 0.21, 0.3, 0.39, 0.53, 0.67, 0.8, 0.92];
/** Small swings off the diagonal so the planets read as a drawn line, not a ruler. */
const ANGLE_SWINGS = [0.2, -0.13, 0.11, -0.09, 0.07, -0.08, -0.06, 0.06];
/** Half-length of each orbit arc, in radians. Inner arcs are longer. */
const ARC_SPANS = [0.5, 0.46, 0.42, 0.39, 0.35, 0.32, 0.29, 0.26];

/** Space the full hover label needs beside its leader line. */
const LABEL_ROOM_WIDE = 230;
const LABEL_ROOM_NARROW = 170;
/** Below this aspect ratio the title gets its own band at the bottom of the plate. */
const PORTRAIT_ASPECT = 0.85;

export interface SunPlacement {
  x: number;
  y: number;
  r: number;
}

export interface PlanetPlacement {
  body: CelestialBody;
  order: number;
  x: number;
  y: number;
  r: number;
  orbitR: number;
  angle: number;
  arcSpan: number;
  labelSide: 1 | -1;
}

export interface PlateLayout {
  width: number;
  height: number;
  /** Inset of the plate frame from the viewport edge (matches --frame-inset in CSS). */
  frameInset: number;
  sun: SunPlacement;
  planets: PlanetPlacement[];
}

export function computePlateLayout(
  planets: CelestialBody[],
  width: number,
  height: number,
): PlateLayout {
  const unit = Math.min(width, height);
  const sunR = unit * 0.26;
  const sx = -sunR * 0.12;
  const sy = -sunR * 0.12;

  // On portrait screens the planets stop above the title band.
  const portrait = width / height < PORTRAIT_ASPECT;
  const plateHeight = portrait ? height * 0.72 : height;
  // On a steep portrait diagonal, angle swings turn into big sideways jumps; damp them.
  const swingScale = portrait ? 0.35 : 1;
  const labelRoom = width < 640 ? LABEL_ROOM_NARROW : LABEL_ROOM_WIDE;

  const far = Math.hypot(width - sx, plateHeight - sy) * 0.96;
  const near = sunR * 1.2;
  const diagonal = Math.atan2(plateHeight - sy, width - sx);
  const margin = Math.max(40, unit * 0.07);

  const placed = planets.map((body, i): PlanetPlacement => {
    // Compressed sizing keeps the giants dominant without dwarfing Mercury.
    const r = Math.max(7, unit * 0.03 * Math.pow(body.displayRadius, 0.55));
    const d = near + (far - near) * ORBIT_STEPS[i % ORBIT_STEPS.length];
    const a = diagonal + ANGLE_SWINGS[i % ANGLE_SWINGS.length] * swingScale;

    const x = clamp(sx + d * Math.cos(a), margin + r, width - margin - r);
    const y = clamp(sy + d * Math.sin(a), margin + r, plateHeight - margin - r);
    const roomRight = width - margin - (x + r);
    const roomLeft = x - r - margin;

    return {
      body,
      order: i + 1,
      x,
      y,
      r,
      orbitR: Math.hypot(x - sx, y - sy),
      angle: Math.atan2(y - sy, x - sx),
      arcSpan: ARC_SPANS[i % ARC_SPANS.length],
      labelSide: roomRight >= labelRoom || roomRight >= roomLeft ? 1 : -1,
    };
  });

  const frameInset = clamp(width * 0.02, 10, 22);

  return { width, height, frameInset, sun: { x: sx, y: sy, r: sunR }, planets: placed };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}
