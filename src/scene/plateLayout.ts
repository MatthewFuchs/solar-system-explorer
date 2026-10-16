// The overview is a fixed composition: the Sun as a quarter disk in the top-left
// corner, planets falling along the page diagonal on concentric partial arcs.
// Positions are art-directed, not astronomical. All values are CSS pixels, origin top-left.
import type { CelestialBody } from "../data/solarSystem";
import { reachFactor } from "./bodyAppearance";

/** Where each planet sits between the Sun's edge and the far corner (0–1). */
const ORBIT_STEPS = [0.12, 0.21, 0.3, 0.39, 0.53, 0.67, 0.8, 0.92];
/** Small swings off the diagonal so the planets read as a drawn line, not a ruler. */
const ANGLE_SWINGS = [0.2, -0.13, 0.11, -0.09, 0.07, -0.08, -0.06, 0.06];
/** Half-length of each orbit arc, in radians. Inner arcs are longer. */
const ARC_SPANS = [0.5, 0.46, 0.42, 0.39, 0.35, 0.32, 0.29, 0.26];

/** Below this aspect ratio the title gets its own band at the bottom of the screen. */
const PORTRAIT_ASPECT = 0.85;
/** Height of the top bar, which planets keep clear of. Matches --bar-h in CSS. */
export const TOP_BAR_HEIGHT = 52;

/** Resting label footprint (name + meta line), used to choose a side that stays clear. */
const LABEL_WIDE = { w: 180, h: 40 };
// On narrow screens labels show only the name at rest (see index.css), so they are shorter.
const LABEL_NARROW = { w: 130, h: 20 };
/** Horizontal run of the connector after its diagonal elbow. */
const CONNECTOR_RUN = 22;

type Box = { left: number; right: number; top: number; bottom: number };
/** Label to the right (1) or left (-1), with a connector that rises (-1) or drops (1). */
type Placement = [side: 1 | -1, lift: 1 | -1];
/** Label placements in order of preference. */
const PLACEMENTS: Placement[] = [
  [1, -1],
  [-1, -1],
  [1, 1],
  [-1, 1],
];

export interface SunPlacement {
  x: number;
  y: number;
  r: number;
}

/** Elbow connector: from the planet's edge, diagonally up (or down), then across to the label node. */
export interface Connector {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
}

export interface PlanetPlacement {
  body: CelestialBody;
  order: number;
  x: number;
  y: number;
  r: number;
  /** Visual radius including rings. */
  reach: number;
  orbitR: number;
  angle: number;
  arcSpan: number;
  labelSide: 1 | -1;
  connector: Connector;
}

export interface PlateLayout {
  width: number;
  height: number;
  /** Inset of the HUD corner marks from the viewport edge (matches --hud-inset in CSS). */
  inset: number;
  sun: SunPlacement;
  planets: PlanetPlacement[];
}

export function computePlateLayout(planets: CelestialBody[], width: number, height: number): PlateLayout {
  const unit = Math.min(width, height);
  const sunR = unit * 0.26;
  const sx = -sunR * 0.12;
  const sy = -sunR * 0.12;

  // On portrait screens the planets stop above the title band.
  const portrait = width / height < PORTRAIT_ASPECT;
  const plateHeight = portrait ? height * 0.72 : height;
  // On a steep portrait diagonal, angle swings turn into big sideways jumps; damp them.
  const swingScale = portrait ? 0.35 : 1;

  const far = Math.hypot(width - sx, plateHeight - sy) * 0.96;
  const near = sunR * 1.2;
  const diagonal = Math.atan2(plateHeight - sy, width - sx);
  const margin = Math.max(40, unit * 0.07);
  const topMargin = Math.max(margin, TOP_BAR_HEIGHT + 28);

  const base = planets.map((body, i) => {
    // Compressed sizing keeps the giants dominant without dwarfing Mercury.
    const r = Math.max(7, unit * 0.03 * Math.pow(body.displayRadius, 0.55));
    const d = near + (far - near) * ORBIT_STEPS[i % ORBIT_STEPS.length];
    const a = diagonal + ANGLE_SWINGS[i % ANGLE_SWINGS.length] * swingScale;
    const x = clamp(sx + d * Math.cos(a), margin + r, width - margin - r);
    const y = clamp(sy + d * Math.sin(a), topMargin + r, plateHeight - margin - r);
    return { body, order: i + 1, x, y, r, reach: r * reachFactor(body.id) };
  });

  const labelSize = width < 640 ? LABEL_NARROW : LABEL_WIDE;

  const placedBoxes: Box[] = [];

  const placed = base.map((p, i): PlanetPlacement => {
    const connectorFor = (side: 1 | -1, lift: 1 | -1): Connector => {
      const x0 = p.x + side * p.r * Math.SQRT1_2;
      const y0 = p.y + lift * p.r * Math.SQRT1_2;
      const rise = Math.max(14, p.reach + 10 - p.r * Math.SQRT1_2);
      const x1 = x0 + side * rise;
      return { x0, y0, x1, y1: y0 + lift * rise, x2: x1 + side * CONNECTOR_RUN };
    };

    const boxFor = ([side, lift]: Placement): Box => {
      const c = connectorFor(side, lift);
      const left = side === 1 ? c.x2 : c.x2 - labelSize.w;
      return { left, right: left + labelSize.w, top: c.y1 - 12, bottom: c.y1 - 12 + labelSize.h };
    };

    // Try up-right, up-left, down-right, down-left; take the first that hits nothing
    // (planets, earlier labels, screen edges), or else the one that hits least.
    const score = (placement: Placement) => {
      const box = boxFor(placement);
      let hits = box.left < margin * 0.5 || box.right > width - margin * 0.5 ? 2 : 0;
      if (box.top < topMargin * 0.75 || box.bottom > plateHeight - margin * 0.25) hits += 2;
      base.forEach((o, j) => {
        if (j !== i && circleHitsBox(o.x, o.y, o.reach + 8, box)) hits += 1;
      });
      for (const other of placedBoxes) if (boxesOverlap(box, other)) hits += 1;
      return hits;
    };
    let best = PLACEMENTS[0];
    let bestScore = Infinity;
    for (const candidate of PLACEMENTS) {
      const s = score(candidate);
      if (s < bestScore) {
        best = candidate;
        bestScore = s;
      }
      if (s === 0) break;
    }
    const [labelSide, lift] = best;
    placedBoxes.push(boxFor(best));

    return {
      ...p,
      orbitR: Math.hypot(p.x - sx, p.y - sy),
      angle: Math.atan2(p.y - sy, p.x - sx),
      arcSpan: ARC_SPANS[i % ARC_SPANS.length],
      labelSide,
      connector: connectorFor(labelSide, lift),
    };
  });

  return {
    width,
    height,
    inset: clamp(width * 0.018, 12, 24),
    sun: { x: sx, y: sy, r: sunR },
    planets: placed,
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function boxesOverlap(a: Box, b: Box) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function circleHitsBox(cx: number, cy: number, r: number, b: Box) {
  const nx = clamp(cx, b.left, b.right);
  const ny = clamp(cy, b.top, b.bottom);
  return Math.hypot(cx - nx, cy - ny) < r;
}
