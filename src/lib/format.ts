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

type Markable = { kind?: "star" | "planet" | "dwarf"; spectralType?: string };

/** The mark a body carries in labels: a Roman numeral, "Dwarf planet", "Our star", or another star's spectral class. */
export function bodyMark(body: Markable, order: number): string {
  if (body.spectralType) return body.spectralType;
  if (body.kind === "star") return "Our star";
  return body.kind === "dwarf" ? "Dwarf planet" : toRoman(order);
}

export function formatLy(ly: number): string {
  return `${ly < 10 ? ly.toFixed(2) : ly.toFixed(1)} ly`;
}

/** How far a body is from the Sun: short for labels ("1.52 AU"), long for sentences. */
export function bodyDistance(body: { distanceAU?: number; distanceLy?: number }): { short: string; long: string } | null {
  if (body.distanceLy !== undefined) {
    return { short: formatLy(body.distanceLy), long: `${body.distanceLy} light-years from the Sun` };
  }
  if (body.distanceAU !== undefined) return { short: formatAU(body.distanceAU), long: `${formatAU(body.distanceAU)} from the Sun` };
  return null;
}

/** What a body is, for screen readers: "our star", "dwarf planet", "planet IV", or "star, class A1V". */
export function bodyNoun(body: Markable, order: number): string {
  if (body.spectralType) return `star, class ${body.spectralType}`;
  if (body.kind === "star") return "our star";
  return body.kind === "dwarf" ? "dwarf planet" : `planet ${toRoman(order)}`;
}
