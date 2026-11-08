// Small geometry shared by every plate's layout. All values are CSS pixels, origin top-left.

export type Box = { left: number; right: number; top: number; bottom: number };

export function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

export function boxesOverlap(a: Box, b: Box) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

export function circleHitsBox(cx: number, cy: number, r: number, b: Box) {
  const nx = clamp(cx, b.left, b.right);
  const ny = clamp(cy, b.top, b.bottom);
  return Math.hypot(cx - nx, cy - ny) < r;
}

/** A w×h box centred on (x, y). */
export function boxAround(x: number, y: number, w: number, h: number): Box {
  return { left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2 };
}

/**
 * A body's click target: generous, but never reaching past halfway to its nearest neighbour,
 * so two bodies drawn close together (the Sun and the Orion Nebula) can both be chosen. Such
 * targets are small; each label's name is a second, larger one (DestinationLabels).
 */
export function hitRadius(p: { x: number; y: number; r: number }, bodies: { x: number; y: number }[]): number {
  let nearest = Infinity;
  for (const o of bodies) {
    if (o !== p) nearest = Math.min(nearest, Math.hypot(o.x - p.x, o.y - p.y));
  }
  return Math.min(Math.max(p.r + 10, 22), nearest / 2);
}
