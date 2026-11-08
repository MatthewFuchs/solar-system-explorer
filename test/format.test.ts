import { describe, expect, it } from "vitest";
import { bodyDistance, bodyMark, bodyNoun, formatAU, formatLy, toRoman } from "../src/lib/format";

describe("toRoman", () => {
  it.each([
    [1, "I"],
    [4, "IV"],
    [5, "V"],
    [8, "VIII"],
    [9, "IX"],
    [10, "X"],
  ])("writes %i as %s", (n, roman) => {
    expect(toRoman(n)).toBe(roman);
  });
});

describe("formatAU", () => {
  it("uses two decimals inside 10 AU and one beyond", () => {
    expect(formatAU(0.387)).toBe("0.39 AU");
    expect(formatAU(1)).toBe("1.00 AU");
    expect(formatAU(30.07)).toBe("30.1 AU");
  });
});

describe("bodyMark", () => {
  it("names the star and dwarf planets, and numbers the planets", () => {
    expect(bodyMark({ kind: "star" }, 0)).toBe("Our star");
    expect(bodyMark({ kind: "dwarf" }, 9)).toBe("Dwarf planet");
    expect(bodyMark({ kind: "planet" }, 3)).toBe("III");
    expect(bodyMark({}, 6)).toBe("VI");
    expect(bodyMark({ kind: "star", spectralType: "A1V" }, 4)).toBe("A1V");
  });
});

describe("distances and names for stars", () => {
  it("writes light-years like AU: two decimals when near, one when far", () => {
    expect(formatLy(4.37)).toBe("4.37 ly");
    expect(formatLy(11.9)).toBe("11.9 ly");
  });

  it("gives a body's distance in light-years or AU, or nothing for the Sun", () => {
    expect(bodyDistance({ distanceLy: 8.6 })).toEqual({ short: "8.60 ly", long: "8.6 light-years from the Sun" });
    expect(bodyDistance({ distanceAU: 1.524 })).toEqual({ short: "1.52 AU", long: "1.52 AU from the Sun" });
    expect(bodyDistance({})).toBeNull();
  });

  it("names a body for screen readers", () => {
    expect(bodyNoun({ kind: "star", spectralType: "M4V" }, 2)).toBe("star, class M4V");
    expect(bodyNoun({ kind: "star" }, 0)).toBe("our star");
    expect(bodyNoun({ kind: "dwarf" }, 9)).toBe("dwarf planet");
    expect(bodyNoun({}, 4)).toBe("planet IV");
  });
});
