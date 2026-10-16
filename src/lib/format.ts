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

/** The mark a body carries in labels: its Roman numeral, "Dwarf planet", or "Our star". */
export function bodyMark(kind: "star" | "planet" | "dwarf" | undefined, order: number): string {
  if (kind === "star") return "Our star";
  return kind === "dwarf" ? "Dwarf planet" : toRoman(order);
}
