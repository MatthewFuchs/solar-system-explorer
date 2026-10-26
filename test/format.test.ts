import { describe, expect, it } from "vitest";
import { bodyMark, formatAU, toRoman } from "../src/lib/format";

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
    expect(bodyMark("star", 0)).toBe("Our star");
    expect(bodyMark("dwarf", 9)).toBe("Dwarf planet");
    expect(bodyMark("planet", 3)).toBe("III");
    expect(bodyMark(undefined, 6)).toBe("VI");
  });
});
