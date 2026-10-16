export type RGB = [number, number, number];

/** Parses "#rrggbb" into 0–1 sRGB channels (no linear conversion; shaders output these as-is). */
export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Desaturates a data color and pulls it toward the paper tone, for the plate's muted planets. */
export function muteTone(hex: string, paperHex: string): RGB {
  const c = hexToRgb(hex);
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return mixRgb(mixRgb(c, [l, l, l], 0.4), hexToRgb(paperHex), 0.2);
}
