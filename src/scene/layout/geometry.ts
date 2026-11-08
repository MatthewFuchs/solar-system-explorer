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
