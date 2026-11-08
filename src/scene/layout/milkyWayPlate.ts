// The Milky Way, seen from above its north pole, to scale. The galaxy's centre (Sagittarius
// A*) and the Sun are 27,000 light-years apart; each landmark sits at its real distance from
// the Sun, projected onto the galaxy's plane, in the direction of its real galactic longitude.
// Rings around the centre every 10,000 light-years; the rim is the disc's edge, 50,000 out.
import { GALAXY_RADIUS_LY, SUN_TO_CENTRE_LY } from "../../data/milkyWay";
import type { CelestialBody } from "../../data/solarSystem";
import { clamp, type Box } from "./geometry";
import { labelName, labelSizeFor, labelWidthFor, placeLabel, reservedAreas, type PlanetPlacement } from "./labels";
import { bodyDistance, bodyMark } from "../../lib/format";
import { PORTRAIT_ASPECT, TOP_BAR_HEIGHT } from "./screen";
import type { ChartEngraving, PlateLayout } from "./solarPlate";
import { AU_PER_LY } from "../voyage";

const RING_STEP_LY = 10000;
/**
 * Where the Sun sits, seen from the galaxy's centre (screen degrees, y down): to the right on
 * landscape screens, where its crowded neighbours' labels have room; lower right on portrait
 * ones, with its neighbours' names stacked in a column beside it (stackCluster).
 */
const SUN_BEARING = { landscape: 8, portrait: 50 };
/** Where the title sits, seen from the centre: the rings open toward it. */
const TOWARD_TITLE = { landscape: 135, portrait: 90 };
const GAP_HALF = 26;
/** Room kept right of the galaxy for the labels of the landmarks that sit there. */
const LABEL_ROOM = 170;
/** Labels keep this far from the galaxy's centre, clear of its bright core. */
const CORE_LY = 5500;
const BOTTOM_CLEAR = 40;

const DEG = Math.PI / 180;

/**
 * The screen angle (radians, y down) from the Sun toward a galactic longitude, seen from the
 * galaxy's north. Longitude 0 points at the centre; 90, the way the Sun is carried as the
 * galaxy turns clockwise, a quarter turn counterclockwise from it.
 */
export function longitudeAngle(glon: number, towardCentre: number): number {
  return towardCentre - glon * DEG;
}

/** A landmark's drawn radius: a small cloud of light. */
const markSize = (body: CelestialBody) => clamp(4 + 1.6 * body.displayRadius, 5, 7);

export function computeMilkyWayLayout(
  sol: CelestialBody,
  landmarks: CelestialBody[],
  width: number,
  height: number,
  title?: { title: string; intro: string },
): PlateLayout {
  const unit = Math.min(width, height);
  const portrait = width / height < PORTRAIT_ASPECT;
  const margin = Math.max(40, unit * 0.07);
  const topMargin = Math.max(margin, TOP_BAR_HEIGHT + 28);
  const floor = portrait ? height * 0.72 : height - BOTTOM_CLEAR;
  let R: number;
  let cx: number;
  let cy: number;
  if (portrait) {
    R = Math.min(width / 2 - 18, (floor - topMargin) / 2);
    cx = width / 2;
    cy = (topMargin + floor) / 2;
  } else {
    R = Math.min((floor - topMargin) / 2, (width - 2 * margin - LABEL_ROOM) / 2);
    cy = (topMargin + floor) / 2;
    cx = clamp(width * 0.56, R + margin, width - margin - R - LABEL_ROOM);
  }
  const lyPerPx = GALAXY_RADIUS_LY / R;
  const sunAngle = (portrait ? SUN_BEARING.portrait : SUN_BEARING.landscape) * DEG;
  const sx = cx + (SUN_TO_CENTRE_LY / lyPerPx) * Math.cos(sunAngle);
  const sy = cy + (SUN_TO_CENTRE_LY / lyPerPx) * Math.sin(sunAngle);
  const towardCentre = sunAngle + Math.PI;

  const solR = 4;
  const bodies = [
    { body: sol, order: 0, x: sx, y: sy, r: solR, reach: solR + 8, orbitR: 0, angle: 0 },
    ...landmarks.map((body, i) => {
      // Seen from above, a landmark off the plane sits a little nearer than its true distance.
      const d = ((body.distanceLy ?? 0) * Math.cos((body.glat ?? 0) * DEG)) / lyPerPx;
      const angle = longitudeAngle(body.glon ?? 0, towardCentre);
      const r = markSize(body);
      return { body, order: i + 1, x: sx + d * Math.cos(angle), y: sy + d * Math.sin(angle), r, reach: r + 8, orbitR: d, angle };
    }),
  ];

  const towardTitle = (portrait ? TOWARD_TITLE.portrait : TOWARD_TITLE.landscape) * DEG;
  const gap = { from: towardTitle - GAP_HALF * DEG, to: towardTitle + GAP_HALF * DEG };
  const rings: ChartEngraving["rings"] = [];
  for (let ly = RING_STEP_LY; ly < GALAXY_RADIUS_LY; ly += RING_STEP_LY) {
    rings.push({ r: ly / lyPerPx, strong: ly % (RING_STEP_LY * 2) === 0 });
  }

  const labelSize = labelSizeFor(width, height);
  // Phones drop a leading "The" from names (labelName), so measure what they show.
  const narrow = labelSize.w < 150;
  const sized = bodies.map((b) => ({
    ...b,
    labelW: labelWidthFor(narrow ? labelName(b.body.name).rest : b.body.name, `${bodyMark(b.body, b.order)} — ${bodyDistance(b.body)?.short ?? ""}`, labelSize),
  }));
  const reserved = reservedAreas(width, height, title);
  // The galaxy's bright core, which names can't be read over (Sagittarius A*'s own name too).
  // Weighed like a body, below the title and credit line: on a crowded screen, the title wins.
  const core = { x: cx, y: cy, r: CORE_LY / lyPerPx, reach: CORE_LY / lyPerPx };
  const space = {
    width,
    labelSize,
    margin,
    topMargin,
    bottom: (portrait ? floor : height) - margin * 0.25,
    bodies: [...sized, core],
    placed: [] as Box[],
    avoid: reserved,
    farLeaders: true,
  };
  // The landmarks around the Sun are a few pixels apart, with no room for their names to fan
  // out: stack them in a column beside the cluster, like a map's callouts, in the same order
  // top to bottom as their points, so no leader crosses another.
  const cluster = Math.max(CLUSTER_PX, CLUSTER_LY / lyPerPx);
  const stacked = stackCluster(sized, { x: cx, y: cy }, cluster + solR, width, margin, labelSize.h);
  for (const s of stacked.values()) space.placed.push(s.labelBox);
  const placed = bodies.map((b, i): PlanetPlacement => ({ ...b, arcSpan: 0, ...(stacked.get(i) ?? placeLabel(i, space)) }));

  return {
    width,
    height,
    diagonal: towardTitle,
    bounds: { left: margin, top: topMargin, right: width - margin, bottom: floor - margin * 0.5 },
    reserved,
    inset: clamp(width * 0.018, 12, 24),
    sun: { x: sx, y: sy, r: solR },
    star: placed[0],
    planets: placed.slice(1),
    chart: { rings, dial: R, zeroHour: 0, gap, hours: [], centre: { x: cx, y: cy } },
    galaxy: { x: cx, y: cy, r: R, sunAngle },
    auPerPx: AU_PER_LY * lyPerPx,
  };
}

type LabelPlacement = Pick<PlanetPlacement, "labelSide" | "labelBox" | "connector">;

/** Landmarks this close to the Sun are part of its cluster: within this many pixels, or light-years, whichever is wider. */
const CLUSTER_PX = 46;
const CLUSTER_LY = 9000;

/**
 * Callout labels for the Sun and the landmarks crowded around it: a column of names beside the
 * cluster, in the same top-to-bottom order as their points, each on an elbow leader.
 */
function stackCluster(
  bodies: { x: number; y: number; r: number; labelW: number }[],
  centre: { x: number; y: number },
  radius: number,
  width: number,
  margin: number,
  labelH: number,
): Map<number, LabelPlacement> {
  const row = labelH + 3;
  const sun = bodies[0];
  const cluster = bodies
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => Math.hypot(b.x - sun.x, b.y - sun.y) <= radius)
    .sort((a, b) => a.b.y - b.b.y);
  const out = new Map<number, LabelPlacement>();
  if (cluster.length < 3) return out;
  // Outward, away from the galaxy's bright core, if the names fit there; otherwise inward.
  const widest = Math.max(...cluster.map(({ b }) => b.labelW));
  const edgeOf = (side: 1 | -1) => (side === 1 ? Math.max(...cluster.map(({ b }) => b.x + b.r)) : Math.min(...cluster.map(({ b }) => b.x - b.r)));
  const fits = (side: 1 | -1) => (side === 1 ? edgeOf(1) + 30 + widest <= width - margin * 0.5 : edgeOf(-1) - 30 - widest >= margin * 0.5);
  const outward: 1 | -1 = sun.x >= centre.x ? 1 : -1;
  const side: 1 | -1 = fits(outward) ? outward : (-outward as 1 | -1);
  const x2 = edgeOf(side) + side * 30;
  const mid = cluster.reduce((sum, { b }) => sum + b.y, 0) / cluster.length;
  cluster.forEach(({ b, i }, k) => {
    const y1 = mid + (k - (cluster.length - 1) / 2) * row;
    const x0 = b.x + side * b.r;
    const left = side === 1 ? x2 : x2 - b.labelW;
    out.set(i, {
      labelSide: side,
      labelBox: { left, right: left + b.labelW, top: y1 - 11, bottom: y1 - 11 + labelH },
      connector: { x0, y0: b.y, x1: x2 - side * 12, y1, x2 },
    });
  });
  return out;
}