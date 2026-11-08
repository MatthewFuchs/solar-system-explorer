const ROMAN: [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function toRoman(n: number): string {
  let out = "";
  for (const [value, glyph] of ROMAN) {
    while (n >= value) {
      out += glyph;
      n -= value;
    }
  }
  return out;
}

export function formatAU(au: number): string {
  return `${au < 10 ? au.toFixed(2) : au.toFixed(1)} AU`;
}

type Markable = { kind?: "star" | "planet" | "dwarf" | "deep-sky"; spectralType?: string; mark?: string };

/**
 * The mark a body carries in labels: a Roman numeral, "Dwarf planet", "Our star", another
 * star's spectral class, or what a deep-sky object is ("Nebula").
 */
export function bodyMark(body: Markable, order: number): string {
  if (body.mark) return body.mark;
  if (body.spectralType) return body.spectralType;
  if (body.kind === "star") return "Our star";
  return body.kind === "dwarf" ? "Dwarf planet" : toRoman(order);
}

export function formatLy(ly: number): string {
  if (ly >= 100) return `${Math.round(ly).toLocaleString("en-US")} ly`;
  return `${ly < 10 ? ly.toFixed(2) : ly.toFixed(1)} ly`;
}

/** How far a body is from the Sun: short for labels ("1.52 AU"), long for sentences. */
export function bodyDistance(body: { distanceAU?: number; distanceLy?: number }): { short: string; long: string } | null {
  if (body.distanceLy !== undefined) {
    return { short: formatLy(body.distanceLy), long: `${body.distanceLy.toLocaleString("en-US")} light-years from the Sun` };
  }
  if (body.distanceAU !== undefined) return { short: formatAU(body.distanceAU), long: `${formatAU(body.distanceAU)} from the Sun` };
  return null;
}

/** What a body is, for screen readers: "our star", "dwarf planet", "planet IV", "star, class A1V", or "nebula". */
export function bodyNoun(body: Markable, order: number): string {
  if (body.mark) return body.mark.toLowerCase();
  if (body.spectralType) return `star, class ${body.spectralType}`;
  if (body.kind === "star") return "our star";
  return body.kind === "dwarf" ? "dwarf planet" : `planet ${toRoman(order)}`;
}
