// Label placement shared by every plate: an elbow leader from the body's edge to a label
// on whichever side hits the least (other bodies, earlier labels, screen edges).
import type { CelestialBody } from "../../data/solarSystem";
import { boxesOverlap, circleHitsBox, type Box } from "./geometry";
import { PORTRAIT_ASPECT, SHORT_HEIGHT } from "./screen";

/** Resting label footprint (name + meta line), used to choose a side that stays clear. */
const LABEL_WIDE = { w: 170, h: 46 };
// On narrow screens labels show only the name at rest (see index.css), so they are shorter.
const LABEL_NARROW = { w: 120, h: 24 };
/** Horizontal run of the connector after its diagonal elbow. */
export const CONNECTOR_RUN = 22;

/**
 * Label to the right (1) or left (-1) on an elbow leader that rises (-1) or drops (1) and
 * reaches so far; or (0) set directly above (-1) or below (1) its point, as on a map.
 */
type Placement = [side: 1 | -1 | 0, lift: 1 | -1, reach?: number];
export type LabelSide = 1 | -1 | 0;
/** Label placements in order of preference. */
const PLACEMENTS: Placement[] = [
  [1, -1],
  [-1, -1],
  [1, 1],
  [-1, 1],
];
/**
 * For crowded plates that opt in: the name set right under or over its point, then the
 * four sides on longer leaders.
 */
const FAR_PLACEMENTS: Placement[] = [
  [0, 1],
  [0, -1],
  ...PLACEMENTS.flatMap(([side, lift]) => [[side, lift, 2.2] as Placement, [side, lift, 3.4] as Placement]),
];

export type LabelSize = { w: number; h: number };

/** Elbow connector: from the body's edge, diagonally up (or down), then across to the label node. */
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
  /** Footprint of the resting label, for keeping other overview elements clear of it. */
  labelBox: Box;
  /** Visual radius including rings. */
  reach: number;
  /** Distance from the plate's centre, and the angle to it (screen radians, y down). */
  orbitR: number;
  angle: number;
  /** Half-length of the body's orbit arc, in radians (0: no arc). */
  arcSpan: number;
  /** 1: right of the leader; -1: left of it; 0: centred over or under the point, with no leader. */
  labelSide: LabelSide;
  connector: Connector;
}

/** Phones (and short landscape screens) show names only at rest; see index.css. */
export function labelSizeFor(width: number, height: number): LabelSize {
  return width < 640 || height < SHORT_HEIGHT ? LABEL_NARROW : LABEL_WIDE;
}

/**
 * Areas other overview elements keep clear of: the title block (bottom-left) and the credit
 * line (bottom-right). Without `title`, the block is the solar plate's fixed approximation
 * (its layout is locked); with it, the block is estimated from the plate's own title and
 * introduction, using the type sizes in index.css (.plate-title).
 */
export function reservedAreas(width: number, height: number, title?: { title: string; intro: string }): Box[] {
  const portrait = width / height < PORTRAIT_ASPECT;
  return [
    portrait
      ? { left: 0, top: height * 0.74, right: width, bottom: height }
      : height < SHORT_HEIGHT
        ? { left: 0, top: height - 70, right: Math.min(width * (title ? 0.6 : 0.42), title ? 520 : 360), bottom: height }
        : title
          ? titleBlock(width, height, title)
          : { left: 0, top: height * 0.6, right: Math.min(width * 0.46, 640), bottom: height },
    // Credit line.
    { left: width - 440, top: height - 44, right: width, bottom: height },
  ];
}

/** Where labels may go, and what they must keep clear of. */
export interface LabelSpace {
  width: number;
  labelSize: LabelSize;
  /** Edge margins: labels closer than half the side margin (or 3/4 of the top) count as clipped. */
  margin: number;
  topMargin: number;
  /** The lowest a label may reach before it counts as clipped. */
  bottom: number;
  /** Every body on the plate, so a label keeps off all but its own. */
  bodies: { x: number; y: number; r: number; reach: number }[];
  /** Labels placed so far; each new label is added. */
  placed: Box[];
  /** Further areas to keep clear of (the title, the credit line), weighted above a body. */
  avoid?: Box[];
  /** Also try longer leaders when every side is crowded. Off for the solar plate, whose layout is locked. */
  farLeaders?: boolean;
}

/**
 * Choose a label side for the body at `index`: up-right, up-left, down-right, down-left,
 * taking the first that hits nothing, or else the one that hits least.
 */
export function placeLabel(index: number, space: LabelSpace): { labelSide: LabelSide; labelBox: Box; connector: Connector } {
  const p = space.bodies[index];
  const r = p.r;
  const { labelSize, margin, topMargin, width } = space;
  const connectorFor = (side: LabelSide, lift: 1 | -1, far = 1): Connector => {
    if (side === 0) {
      // No leader: the label's anchor (y1, 11px below its top) sits just past the point.
      const top = lift === 1 ? p.y + r + 6 : p.y - r - 6 - labelSize.h;
      return { x0: p.x, y0: p.y, x1: p.x, y1: top + 11, x2: p.x };
    }
    const x0 = p.x + side * r * Math.SQRT1_2;
    const y0 = p.y + lift * r * Math.SQRT1_2;
    const rise = Math.max(14, p.reach + 10 - r * Math.SQRT1_2) * far;
    const x1 = x0 + side * rise;
    return { x0, y0, x1, y1: y0 + lift * rise, x2: x1 + side * CONNECTOR_RUN };
  };
  const boxFor = ([side, lift, far]: Placement): Box => {
    const c = connectorFor(side, lift, far);
    if (side === 0) return { left: c.x2 - labelSize.w / 2, right: c.x2 + labelSize.w / 2, top: c.y1 - 11, bottom: c.y1 - 11 + labelSize.h };
    const left = side === 1 ? c.x2 : c.x2 - labelSize.w;
    return { left, right: left + labelSize.w, top: c.y1 - 11, bottom: c.y1 - 11 + labelSize.h };
  };
  const score = (placement: Placement) => {
    const box = boxFor(placement);
    // A clipped label is worse than a slight overlap, so going off-screen weighs heavily.
    let hits = box.left < margin * 0.5 || box.right > width - margin * 0.5 ? 4 : 0;
    // Actually off the screen is never acceptable. (Solar labels all sit on screen, so this
    // only ever rules out candidates there; it can't change a choice.)
    if (box.left < 0 || box.right > width) hits += 10;
    if (box.top < topMargin * 0.75 || box.bottom > space.bottom) hits += 4;
    space.bodies.forEach((o, j) => {
      if (j !== index && circleHitsBox(o.x, o.y, o.reach + 8, box)) hits += 1;
    });
    for (const other of space.placed) if (boxesOverlap(box, other)) hits += 1;
    for (const a of space.avoid ?? []) if (boxesOverlap(box, a)) hits += 2;
    return hits;
  };
  let best = PLACEMENTS[0];
  let bestScore = Infinity;
  for (const candidate of space.farLeaders ? [...PLACEMENTS, ...FAR_PLACEMENTS] : PLACEMENTS) {
    const s = score(candidate);
    if (s < bestScore) {
      best = candidate;
      bestScore = s;
    }
    if (s === 0) break;
  }
  const labelBox = boxFor(best);
  space.placed.push(labelBox);
  return { labelSide: best[0], labelBox, connector: connectorFor(best[0], best[1], best[2]) };
}

/** The landscape title block: two lines of the title (its last word alone), then the introduction. */
function titleBlock(width: number, height: number, { title, intro }: { title: string; intro: string }): Box {
  const clampPx = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  const left = clampPx(width * 0.018, 12, 24) + clampPx(width * 0.035, 18, 56);
  const bottom = clampPx(width * 0.018, 12, 24) + clampPx(width * 0.035, 18, 52);
  const titlePx = clampPx(width * 0.056, 32, 92);
  const introPx = clampPx(width * 0.013, 16, 19);
  const words = title.split(" ");
  const lines = [words.slice(0, -1).join(" "), words.at(-1) ?? ""];
  // Marcellus capitals with 0.06em tracking run about 0.74em a letter.
  const titleWidth = Math.max(...lines.map((l) => l.length)) * titlePx * 0.74;
  // The introduction is set at 40ch, about 44 letters of italic Cormorant a line.
  const introLines = Math.ceil(intro.length / 44);
  const blockHeight = 2 * titlePx * 1.04 + introPx * 0.9 + introLines * introPx * 1.45;
  return { left: 0, top: height - bottom - blockHeight, right: left + Math.max(titleWidth, introPx * 22), bottom: height };
}
