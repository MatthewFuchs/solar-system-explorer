// The solar plate is a fixed composition: the Sun as a quarter disk in the top-left
// corner, planets falling along the page diagonal on concentric partial arcs.
// Positions are art-directed, not astronomical. All values are CSS pixels, origin top-left.
import type { Belt, CelestialBody, Spacecraft } from "../../data/solarSystem";
import { reachFactor } from "../bodyAppearance";
import { boxAround, boxesOverlap, circleHitsBox, clamp, type Box } from "./geometry";
import { CONNECTOR_RUN, labelSizeFor, placeLabel, reservedAreas, type Connector, type PlanetPlacement } from "./labels";
import { PORTRAIT_ASPECT, TOP_BAR_HEIGHT } from "./screen";

/** Where each body sits between the Sun's edge and the far corner (0–1); the ninth is Pluto. */
const ORBIT_STEPS = [0.12, 0.21, 0.3, 0.39, 0.53, 0.67, 0.8, 0.92, 0.985];
/** Small swings off the diagonal so the planets read as a drawn line, not a ruler. */
const ANGLE_SWINGS = [0.2, -0.13, 0.11, -0.09, 0.07, -0.08, -0.06, 0.06, -0.17];
/** Half-length of each orbit arc, in radians. Inner arcs are longer. */
const ARC_SPANS = [0.5, 0.46, 0.42, 0.39, 0.35, 0.32, 0.29, 0.26, 0.22];

/** Angle offsets (radians) tried in order when a body would overlap another. */
const BODY_NUDGES = [0, 0.06, -0.06, 0.12, -0.12, 0.2, -0.2, 0.3, -0.3, 0.42, -0.42, 0.56, -0.56];

export type { Connector, PlanetPlacement } from "./labels";

export interface SunPlacement {
  x: number;
  y: number;
  r: number;
}

export interface PlateLayout {
  width: number;
  height: number;
  /** Angle of the centre-to-far-corner diagonal (screen radians, y down). */
  diagonal: number;
  /** Area that markers and labels are kept inside. */
  bounds: Box;
  /** Areas other overview elements keep clear of: the title block and the credit line. */
  reserved: Box[];
  /** Inset of the HUD corner marks from the viewport edge (matches --hud-inset in CSS). */
  inset: number;
  /** The plate's centre star (the Sun; Sol on the neighbourhood chart). */
  sun: SunPlacement;
  /** The centre as a selectable body: its label, leader, and hit area (it has no orbit arc). */
  star: PlanetPlacement;
  planets: PlanetPlacement[];
  /** A to-scale chart's engraving (the neighbourhood): distance rings and the hour dial. */
  chart?: ChartEngraving;
}

/** Concentric distance rings around the centre, and an hour dial of right ascension. */
export interface ChartEngraving {
  /** Ring radii in pixels, every two light-years; every other one (4, 8, 12 ly) is drawn stronger. */
  rings: { r: number; strong: boolean }[];
  /** Radius of the hour dial. */
  dial: number;
  /** Screen angle (radians, y down) of 0h; hours run counterclockwise on screen. */
  zeroHour: number;
  /** Rings and the dial are open between these screen angles (from < to, radians), toward the title. */
  gap: { from: number; to: number };
  /** The dial's numerals (0h, 6h, 12h, 18h) and where they sit. */
  hours: { h: number; x: number; y: number }[];
}

export function computePlateLayout(star: CelestialBody, planets: CelestialBody[], width: number, height: number): PlateLayout {
  const unit = Math.min(width, height);
  // The Sun as a quarter disk, its centre just off the top-left corner.
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

  const base: { body: CelestialBody; order: number; x: number; y: number; r: number; reach: number }[] = [];
  planets.forEach((body, i) => {
    // Compressed sizing keeps the giants dominant without dwarfing Mercury.
    const r = Math.max(7, unit * 0.03 * Math.pow(body.displayRadius, 0.55));
    const reach = r * reachFactor(body.id);
    const d = near + (far - near) * ORBIT_STEPS[i % ORBIT_STEPS.length];
    const a0 = diagonal + ANGLE_SWINGS[i % ANGLE_SWINGS.length] * swingScale;
    // If clamping to the screen pushes a body onto one already placed (outer bodies on a
    // narrow screen), slide it along its own orbit until it is clear.
    let x = 0;
    let y = 0;
    for (const nudge of BODY_NUDGES) {
      x = clamp(sx + d * Math.cos(a0 + nudge), margin + r, width - margin - r);
      y = clamp(sy + d * Math.sin(a0 + nudge), topMargin + r, plateHeight - margin - r);
      if (base.every((o) => Math.hypot(x - o.x, y - o.y) > reach + o.reach + 14)) break;
    }
    base.push({ body, order: i + 1, x, y, r, reach });
  });

  const labelSize = labelSizeFor(width, height);
  const placedBoxes: Box[] = [];

  // The Sun's label sits just past its visible edge, toward the planets, with a short
  // leader dropping from the rim. Placed first, so planet labels keep clear of it.
  const rim = { x: sx + sunR * Math.SQRT1_2, y: sy + sunR * Math.SQRT1_2 };
  const starRise = Math.max(18, unit * 0.035);
  const starConnector: Connector = {
    x0: rim.x,
    y0: rim.y,
    x1: rim.x + starRise,
    y1: rim.y + starRise,
    x2: rim.x + starRise + CONNECTOR_RUN,
  };
  const starLabelBox: Box = {
    left: starConnector.x2,
    right: starConnector.x2 + labelSize.w,
    top: starConnector.y1 - 11,
    bottom: starConnector.y1 - 11 + labelSize.h,
  };
  placedBoxes.push(starLabelBox);
  const starPlacement: PlanetPlacement = {
    body: star,
    order: 0,
    x: sx,
    y: sy,
    r: sunR,
    reach: sunR,
    labelBox: starLabelBox,
    orbitR: 0,
    angle: diagonal,
    arcSpan: 0,
    labelSide: 1,
    connector: starConnector,
  };

  const space = { width, labelSize, margin, topMargin, bottom: plateHeight - margin * 0.25, bodies: base, placed: placedBoxes };
  const placed = base.map(
    (p, i): PlanetPlacement => ({
      ...p,
      orbitR: Math.hypot(p.x - sx, p.y - sy),
      angle: Math.atan2(p.y - sy, p.x - sx),
      arcSpan: ARC_SPANS[i % ARC_SPANS.length],
      ...placeLabel(i, space),
    }),
  );

  return {
    width,
    height,
    diagonal,
    bounds: { left: margin, top: topMargin, right: width - margin, bottom: plateHeight - margin * 0.5 },
    reserved: reservedAreas(width, height),
    inset: clamp(width * 0.018, 12, 24),
    sun: { x: sx, y: sy, r: sunR },
    star: starPlacement,
    planets: placed,
  };
}

const DEG = Math.PI / 180;

export interface SpacecraftSpot {
  craft: Spacecraft;
  x: number;
  y: number;
}

/** Room a spacecraft drawing needs, centered on its spot. */
const CRAFT_BOX = 44;
/** Approximate footprint of a belt label. */
const BELT_LABEL = { w: 120, h: 26 };
/** Alternatives tried, in order, when a preferred spot is taken: bearing offsets (degrees) and distance scales. */
const BEARING_NUDGES = [0, 18, -18, 36, -36, 56, -56, 80, -80, 110, -110, 150, -150, 180];
const DISTANCE_NUDGES = [1, 1.35, 0.8, 1.7];

/** How many things a box would collide with; going out of bounds counts double. */
function crowding(box: Box, layout: PlateLayout, others: Box[]) {
  const b = layout.bounds;
  let hits = box.left < b.left || box.right > b.right || box.top < b.top || box.bottom > b.bottom ? 2 : 0;
  for (const p of layout.planets) {
    if (circleHitsBox(p.x, p.y, p.reach + 6, box)) hits += 1;
    if (boxesOverlap(box, p.labelBox)) hits += 1;
  }
  if (circleHitsBox(layout.sun.x, layout.sun.y, layout.sun.r + 4, box)) hits += 1;
  if (boxesOverlap(box, layout.star.labelBox)) hits += 1;
  for (const o of [...layout.reserved, ...others]) if (boxesOverlap(box, o)) hits += 1;
  return hits;
}

function bodyCenter(layout: PlateLayout, id: string) {
  if (id === "sun") return { ...layout.sun, away: layout.diagonal };
  const p = layout.planets.find((pl) => pl.body.id === id);
  if (!p) return null;
  return { x: p.x, y: p.y, r: p.r, away: p.angle };
}

export interface BeltShape {
  belt: Belt;
  /** Sun center the band is drawn around. */
  cx: number;
  cy: number;
  inner: number;
  outer: number;
  /** Screen angles (radians, y down) of the band's ends. */
  a0: number;
  a1: number;
  labelX: number;
  labelY: number;
  labelBox: Box;
}

/**
 * Belt bands: radii between two bodies' orbits, spanning an arc around the diagonal.
 * The label starts at the data's labelAt and slides along the band to a clear spot.
 */
export function placeBelts(layout: PlateLayout, belts: Belt[]): BeltShape[] {
  const { sun, diagonal } = layout;
  const placed: Box[] = [];
  return belts.flatMap((belt) => {
    const [ra, rb] = belt.between.map((id) => layout.planets.find((p) => p.body.id === id)?.orbitR);
    if (ra === undefined || rb === undefined) return [];
    const inner = ra + (rb - ra) * belt.fill[0];
    const outer = ra + (rb - ra) * belt.fill[1];
    const mid = (inner + outer) / 2;
    let best = { x: 0, y: 0, box: boxAround(0, 0, 0, 0), score: Infinity };
    for (const nudge of [0, -4, 4, -8, 8, -12, 12, -16, 16, -20, 20]) {
      const deg = Math.min(belt.arc[1], Math.max(belt.arc[0], belt.labelAt + nudge));
      const a = diagonal - deg * DEG;
      const x = clamp(sun.x + Math.cos(a) * mid, layout.bounds.left + BELT_LABEL.w / 2, layout.bounds.right - BELT_LABEL.w / 2);
      const y = clamp(sun.y + Math.sin(a) * mid, layout.bounds.top + BELT_LABEL.h / 2, layout.bounds.bottom - BELT_LABEL.h / 2);
      const box = boxAround(x, y, BELT_LABEL.w, BELT_LABEL.h);
      const score = crowding(box, layout, placed);
      if (score < best.score) best = { x, y, box, score };
      if (score === 0) break;
    }
    placed.push(best.box);
    return [
      {
        belt,
        cx: sun.x,
        cy: sun.y,
        inner,
        outer,
        a0: diagonal - belt.arc[1] * DEG,
        a1: diagonal - belt.arc[0] * DEG,
        labelX: best.x,
        labelY: best.y,
        labelBox: best.box,
      },
    ];
  });
}

/**
 * Spacecraft positions from their data placement: a bearing measured from the anchor
 * body's away-from-Sun direction (counterclockwise on screen) and a distance in that
 * body's overview radii. If that spot is crowded, nearby bearings and distances are
 * tried and the clearest one wins.
 */
export function placeSpacecraft(layout: PlateLayout, craft: Spacecraft[], avoid: Box[] = []): SpacecraftSpot[] {
  const placed: Box[] = [...avoid];
  const half = CRAFT_BOX / 2;
  return craft.flatMap((c) => {
    const a = bodyCenter(layout, c.placement.anchor);
    if (!a) return [];
    let best = { x: a.x, y: a.y, box: boxAround(a.x, a.y, CRAFT_BOX, CRAFT_BOX), score: Infinity };
    search: for (const scale of DISTANCE_NUDGES) {
      for (const nudge of BEARING_NUDGES) {
        const theta = a.away - (c.placement.bearing + nudge) * DEG;
        const d = c.placement.distance * scale * a.r;
        // Clamp before scoring, so collisions are judged where the drawing would really sit.
        const x = clamp(a.x + Math.cos(theta) * d, layout.bounds.left + half, layout.bounds.right - half);
        const y = clamp(a.y + Math.sin(theta) * d, layout.bounds.top + half, layout.bounds.bottom - half);
        const box = boxAround(x, y, CRAFT_BOX, CRAFT_BOX);
        const score = crowding(box, layout, placed);
        if (score < best.score) best = { x, y, box, score };
        if (score === 0) break search;
      }
    }
    placed.push(best.box);
    return [{ craft: c, x: best.x, y: best.y }];
  });
}
