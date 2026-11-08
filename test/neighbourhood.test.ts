import { describe, expect, it } from "vitest";
import { NEIGHBOURS, SOL } from "../src/data/neighbourhood";
import { NEIGHBOURHOOD_PLATE, PLATES, SOLAR_PLATE, plateById } from "../src/data/plates";
import { isSurfacePOI } from "../src/data/solarSystem";
import { appearanceFor } from "../src/scene/bodyAppearance";
import { DIAL_LY, hourAngle } from "../src/scene/layout/neighbourhoodPlate";
import { composePlate } from "../src/scene/layout/plates";

const VIEWPORTS: [number, number][] = [
  [1440, 900],
  [1280, 800],
  [768, 1024],
  [390, 844],
  [360, 740],
  [375, 667],
  [844, 390],
];

describe("neighbourhood data", () => {
  it("lists stars nearest first, each with a real distance and spectral class", () => {
    const ly = NEIGHBOURS.map((s) => s.distanceLy!);
    expect([...ly].sort((a, b) => a - b)).toEqual(ly);
    for (const s of NEIGHBOURS) {
      expect(s.kind, s.id).toBe("star");
      expect(s.distanceLy, s.id).toBeGreaterThan(4);
      expect(s.spectralType, s.id).toMatch(/^[OBAFGKM]\d/);
    }
  });

  it("keeps ids unique across every plate, so URLs stay flat", () => {
    const ids = PLATES.flatMap((p) => p.bodies.map((b) => b.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PLATES) expect(ids, p.id).not.toContain(p.path || "-");
  });

  it("puts companions, planets, and disks beside each star, never on it", () => {
    for (const s of NEIGHBOURS) {
      expect(s.pois.length, s.id).toBeGreaterThan(0);
      for (const poi of s.pois) expect(isSurfacePOI(poi), poi.id).toBe(false);
    }
  });

  it("cites an https source for every point of interest", () => {
    for (const poi of NEIGHBOURS.flatMap((s) => s.pois)) expect(new URL(poi.source.url).protocol, poi.id).toBe("https:");
  });

  it("gives every star at least three points of interest, each with at least three facts", () => {
    for (const s of NEIGHBOURS) {
      expect(s.pois.length, s.id).toBeGreaterThanOrEqual(3);
      for (const poi of s.pois) expect(poi.facts.length, poi.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("draws every star as a recoloured star, and Sol as the Sun", () => {
    for (const s of NEIGHBOURS) expect(appearanceFor(s.id).tint, s.id).toMatch(/^#[0-9A-F]{6}$/i);
    expect(appearanceFor(SOL.id)).toBe(appearanceFor("sun"));
  });

  it("links the two scales both ways", () => {
    expect(plateById(SOLAR_PLATE.outward!)).toBe(NEIGHBOURHOOD_PLATE);
    expect(plateById(NEIGHBOURHOOD_PLATE.inward!.plate)).toBe(SOLAR_PLATE);
    expect(NEIGHBOURHOOD_PLATE.centre).toBe(SOL);
    expect(() => plateById("andromeda")).toThrow(/andromeda/);
  });
});

describe.each(VIEWPORTS)("neighbourhood chart at %ix%i", (width, height) => {
  const layout = composePlate(NEIGHBOURHOOD_PLATE, width, height);
  const { chart, sun } = layout;

  it("centres the chart on Sol, a pinpoint, with every star once", () => {
    expect(layout.star.body).toBe(SOL);
    expect(layout.star.x).toBe(sun.x);
    expect(sun.r).toBeLessThanOrEqual(6);
    expect(layout.planets.map((p) => p.body.id)).toEqual(NEIGHBOURS.map((s) => s.id));
    for (const p of layout.planets) expect(p.r, p.body.id).toBeLessThanOrEqual(6);
  });

  it("draws distance to scale: every star's distance from Sol is proportional to its light-years", () => {
    const pxPerLy = chart!.dial / DIAL_LY;
    for (const p of layout.planets) {
      expect(Math.hypot(p.x - sun.x, p.y - sun.y), p.body.id).toBeCloseTo(p.body.distanceLy! * pxPerLy, 6);
    }
  });

  it("sets each star in the direction of its right ascension", () => {
    for (const p of layout.planets) {
      const a = Math.atan2(p.y - sun.y, p.x - sun.x);
      const want = hourAngle(p.body.ra!, chart!.zeroHour);
      expect(Math.cos(a - want), p.body.id).toBeCloseTo(1, 6);
    }
  });

  it("engraves a ring every two light-years inside the hour dial, every other one stronger", () => {
    expect(chart!.rings.map((r) => r.strong)).toEqual([false, true, false, true, false, true]);
    expect(chart!.rings[0].r).toBeCloseTo((2 * chart!.dial) / DIAL_LY, 6);
    for (const r of chart!.rings) expect(r.r).toBeLessThan(chart!.dial);
  });

  it("numbers the dial at 0h, 6h, 12h, and 18h, on screen", () => {
    // Whether a numeral touches a star's name depends on the rendered text: e2e/responsive checks it.
    expect(chart!.hours.map((h) => h.h)).toEqual([0, 6, 12, 18]);
    for (const m of chart!.hours) {
      expect(m.x, `${m.h}h`).toBeGreaterThan(10);
      expect(m.x, `${m.h}h`).toBeLessThan(width - 10);
      expect(m.y, `${m.h}h`).toBeGreaterThan(10);
    }
  });

  it("keeps every star and label on screen, and labels off the title and credit line", () => {
    for (const p of [layout.star, ...layout.planets]) {
      expect(p.x - p.r, p.body.id).toBeGreaterThan(0);
      expect(p.x + p.r, p.body.id).toBeLessThan(width);
      expect(p.y - p.r, p.body.id).toBeGreaterThan(0);
      expect(p.y + p.r, p.body.id).toBeLessThan(height);
      expect(p.labelBox.left, p.body.id).toBeGreaterThanOrEqual(0);
      expect(p.labelBox.right, p.body.id).toBeLessThanOrEqual(width);
      for (const area of layout.reserved) {
        const overlaps =
          p.labelBox.left < area.right && area.left < p.labelBox.right && p.labelBox.top < area.bottom && area.top < p.labelBox.bottom;
        expect(overlaps, `${p.body.id} label on a reserved area`).toBe(false);
      }
    }
  });

  it("keeps the hour dial on screen", () => {
    expect(sun.y - chart!.dial).toBeGreaterThan(0);
    expect(sun.y + chart!.dial).toBeLessThan(height);
  });
});

describe("sources", () => {
  it("cites primary or institutional sources, never an encyclopedia anyone can edit", () => {
    const content = PLATES.flatMap((p) => [...p.bodies.flatMap((b) => b.pois), ...(p.spacecraft ?? []), ...(p.belts ?? [])]);
    for (const c of content) expect(new URL(c.source.url).hostname, c.id).not.toMatch(/wikipedia\.org$/);
  });
});

describe("plate composition", () => {
  it("refuses a plate it has no composition for", () => {
    expect(() => composePlate({ ...NEIGHBOURHOOD_PLATE, id: "unknown" }, 800, 600)).toThrow(/unknown/);
  });

  it("composes the solar plate as before: the Sun as the centre, every other body on the diagonal", () => {
    const layout = composePlate(SOLAR_PLATE, 1440, 900);
    expect(layout.star.body.id).toBe("sun");
    expect(layout.planets.map((p) => p.body.id)).not.toContain("sun");
    expect(layout.planets).toHaveLength(SOLAR_PLATE.bodies.length - 1);
  });
});
