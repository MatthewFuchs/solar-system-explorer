// The stellar neighbourhood as a true-scale chart: Sol at the centre, each star at its
// real distance (to scale, linear) in the direction of its right ascension, read like the
// hour dial of an astrolabe. Stars are pinpoints; most of the plate is empty, as space is.
import type { CelestialBody } from "../../data/solarSystem";
import { boxAround, clamp, type Box } from "./geometry";
import { labelSizeFor, placeLabel, reservedAreas, type PlanetPlacement } from "./labels";
import { PORTRAIT_ASPECT, TOP_BAR_HEIGHT } from "./screen";
import type { ChartEngraving, PlateLayout } from "./solarPlate";
import { AU_PER_LY } from "../voyage";

/** The hour dial's radius, in light-years: just past the farthest star. */
export const DIAL_LY = 12.5;
/**
 * Distance rings every this many light-years; every other one is drawn stronger. They carry
 * no numbers: every star's label gives its distance, and the plate's intro says what a ring is.
 */
const RING_STEP_LY = 2;
/**
 * The hour that faces the bottom-left, toward the title. 21.85h is the middle of the one
 * empty stretch of sky among these stars (between Barnard's Star and Tau Ceti), so the
 * chart opens toward the title instead of crowding it.
 */
const HOUR_TOWARD_TITLE = 21.85;
/**
 * Where the title sits, seen from the chart's centre (screen degrees, y down): bottom-left
 * on landscape screens, straight below on portrait ones. The chart turns so its empty
 * stretch of sky faces it, and its rings open toward it, a little past 0h.
 */
const TOWARD_TITLE = { landscape: 135, portrait: 90 };
const GAP_TURN = 5;
const GAP_HALF = 28;
/** How far the dial's numerals sit outside it. */
const HOUR_LABEL_OFFSET = 22;
/** Footprints of the engraving's small labels, which star labels keep clear of. */
const HOUR_LABEL = { w: 28, h: 16 };
/** Room kept right of the chart for the labels of the stars that sit there. */
const LABEL_ROOM = 190;
/** Space kept below the chart on landscape screens, for the credit line. */
const BOTTOM_CLEAR = 40;

const DEG = Math.PI / 180;

/** Screen angle (radians, y down) for a right ascension, with hours running counterclockwise. */
export function hourAngle(hours: number, zeroHour: number): number {
  return zeroHour - hours * 15 * DEG;
}

/** A star's drawn radius: a pinpoint, a little larger for the brighter, bigger stars. */
const pinpoint = (body: CelestialBody) => clamp(2.5 + 1.6 * Math.pow(body.displayRadius, 0.6), 3, 6);

export function computeNeighbourhoodLayout(
  sol: CelestialBody,
  stars: CelestialBody[],
  width: number,
  height: number,
  title?: { title: string; intro: string },
): PlateLayout {
  const unit = Math.min(width, height);
  const portrait = width / height < PORTRAIT_ASPECT;
  const margin = Math.max(40, unit * 0.07);
  const topMargin = Math.max(margin, TOP_BAR_HEIGHT + 28);
  // Portrait: the chart sits above the title band. Landscape: right of centre, clear of the credit line.
  const floor = portrait ? height * 0.72 : height - BOTTOM_CLEAR;
  let R: number;
  let cx: number;
  let cy: number;
  if (portrait) {
    // Room at the sides for the dial's numerals.
    R = Math.min(width / 2 - HOUR_LABEL_OFFSET - 14, (floor - topMargin) / 2);
    cx = width / 2;
    cy = (topMargin + floor) / 2;
  } else {
    R = Math.min((floor - topMargin) / 2, (width - 2 * margin - LABEL_ROOM) / 1.9);
    cy = (topMargin + floor) / 2;
    cx = clamp(width * 0.58, R + margin, width - margin - R * 0.92 - LABEL_ROOM);
  }
  const towardTitle = portrait ? TOWARD_TITLE.portrait : TOWARD_TITLE.landscape;
  const zeroHour = (towardTitle + HOUR_TOWARD_TITLE * 15) * DEG;
  const scale = R / DIAL_LY;

  const solR = 4;
  const bodies = [
    { body: sol, order: 0, x: cx, y: cy, r: solR, reach: solR + 8, orbitR: 0, angle: 0 },
    ...stars.map((body, i) => {
      const d = (body.distanceLy ?? 0) * scale;
      const angle = hourAngle(body.ra ?? 0, zeroHour);
      const r = pinpoint(body);
      return { body, order: i + 1, x: cx + d * Math.cos(angle), y: cy + d * Math.sin(angle), r, reach: r + 8, orbitR: d, angle };
    }),
  ];

  // The dial's numerals are placed first, so star labels keep clear of them too.
  const gapMid = towardTitle + GAP_TURN;
  const gap = { from: (gapMid - GAP_HALF) * DEG, to: (gapMid + GAP_HALF) * DEG };
  const rings: ChartEngraving["rings"] = [];
  for (let ly = RING_STEP_LY; ly < DIAL_LY; ly += RING_STEP_LY) {
    rings.push({ r: ly * scale, strong: ly % (RING_STEP_LY * 2) === 0 });
  }
  const hours: ChartEngraving["hours"] = [];
  for (const h of [0, 6, 12, 18]) {
    const a = hourAngle(h, zeroHour);
    const d = R + HOUR_LABEL_OFFSET;
    hours.push({ h, x: cx + d * Math.cos(a), y: cy + d * Math.sin(a) });
  }
  const engraving: Box[] = hours.map((l) => boxAround(l.x, l.y, HOUR_LABEL.w, HOUR_LABEL.h));

  const reserved = reservedAreas(width, height, title);
  const space = {
    width,
    labelSize: labelSizeFor(width, height),
    margin,
    topMargin,
    bottom: (portrait ? floor : height) - margin * 0.25,
    bodies,
    placed: [] as Box[],
    avoid: [...reserved, ...engraving],
    farLeaders: true,
  };
  const placed = bodies.map((b, i): PlanetPlacement => ({ ...b, arcSpan: 0, ...placeLabel(i, space) }));

  return {
    width,
    height,
    diagonal: towardTitle * DEG,
    bounds: { left: margin, top: topMargin, right: width - margin, bottom: floor - margin * 0.5 },
    reserved,
    inset: clamp(width * 0.018, 12, 24),
    sun: { x: cx, y: cy, r: solR },
    star: placed[0],
    planets: placed.slice(1),
    chart: { rings, dial: R, zeroHour, gap, hours },
    auPerPx: AU_PER_LY / scale,
  };
}
