import { describe, expect, it } from "vitest";
import { NEIGHBOURS, SOL } from "../src/data/neighbourhood";
import { NEIGHBOURHOOD_PLATE, PLATES, SOLAR_PLATE, plateById } from "../src/data/plates";
import { isSurfacePOI } from "../src/data/solarSystem";
import { appearanceFor } from "../src/scene/bodyAppearance";
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

describe.each(VIEWPORTS)("neighbourhood layout at %ix%i", (width, height) => {
  const layout = composePlate(NEIGHBOURHOOD_PLATE, width, height);

  it("places Sol small, in the top-left corner, and every star once", () => {
    expect(layout.star.body).toBe(SOL);
    expect(layout.sun.x).toBeGreaterThan(0);
    expect(layout.sun.x).toBeLessThan(width / 4);
    expect(layout.sun.r).toBeLessThan(Math.min(width, height) * 0.05);
    expect(layout.planets.map((p) => p.body.id)).toEqual(NEIGHBOURS.map((s) => s.id));
  });

  it("sets nearer stars on inner arcs", () => {
    for (let i = 1; i < layout.planets.length; i++) {
      expect(layout.planets[i].orbitR, layout.planets[i].body.id).toBeGreaterThanOrEqual(layout.planets[i - 1].orbitR - 1);
    }
  });

  it("keeps every star and label on screen, and labels off the credit line", () => {
    const credit = layout.reserved[1];
    for (const p of [layout.star, ...layout.planets]) {
      expect(p.x - p.r, p.body.id).toBeGreaterThan(0);
      expect(p.y + p.r, p.body.id).toBeLessThan(height);
      expect(p.labelBox.left, p.body.id).toBeGreaterThanOrEqual(0);
      expect(p.labelBox.right, p.body.id).toBeLessThanOrEqual(width);
      const overlapsCredit = p.labelBox.right > credit.left && p.labelBox.bottom > credit.top;
      expect(overlapsCredit, `${p.body.id} label on the credit line`).toBe(false);
    }
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
