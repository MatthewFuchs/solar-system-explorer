import { describe, expect, it } from "vitest";
import { BELTS, DESTINATIONS, SPACECRAFT, SUN } from "../src/data/solarSystem";
import { reachFactor } from "../src/scene/bodyAppearance";
import { computeFeaturePlacement, computePlateLayout, placeBelts, placeSpacecraft } from "../src/scene/plateLayout";

/** The viewports the project is checked at (CLAUDE.md), plus a desktop. */
const VIEWPORTS: [number, number][] = [
  [1440, 900],
  [1280, 800],
  [768, 1024],
  [390, 844],
  [360, 740],
  [375, 667],
  [844, 390],
];

describe.each(VIEWPORTS)("overview layout at %ix%i", (width, height) => {
  const layout = computePlateLayout(SUN, DESTINATIONS, width, height);

  it("places every destination once, in order", () => {
    expect(layout.planets.map((p) => p.body.id)).toEqual(DESTINATIONS.map((b) => b.id));
  });

  it("keeps every planet's center on screen", () => {
    for (const p of layout.planets) {
      expect(p.x, p.body.id).toBeGreaterThan(0);
      expect(p.x, p.body.id).toBeLessThan(width);
      expect(p.y, p.body.id).toBeGreaterThan(0);
      expect(p.y, p.body.id).toBeLessThan(height);
      expect(p.r, p.body.id).toBeGreaterThan(0);
    }
  });

  it("puts the Sun in the top-left corner", () => {
    expect(layout.sun.x).toBeLessThan(width / 2);
    expect(layout.sun.y).toBeLessThan(height / 2);
  });

  it("moves planets outward from the Sun", () => {
    // Pluto is left out: its real orbit dips inside Neptune's.
    const planets = layout.planets.filter((p) => p.body.kind !== "dwarf");
    for (let i = 1; i < planets.length; i++) expect(planets[i].orbitR, planets[i].body.id).toBeGreaterThan(planets[i - 1].orbitR);
  });

  it("keeps every label inside the screen", () => {
    for (const p of [layout.star, ...layout.planets]) {
      expect(p.labelBox.left, p.body.id).toBeGreaterThanOrEqual(0);
      expect(p.labelBox.right, p.body.id).toBeLessThanOrEqual(width);
      expect(p.labelBox.top, p.body.id).toBeGreaterThanOrEqual(0);
      expect(p.labelBox.bottom, p.body.id).toBeLessThanOrEqual(height);
    }
  });

  it("places every belt and spacecraft", () => {
    expect(placeBelts(layout, BELTS)).toHaveLength(BELTS.length);
    const craft = placeSpacecraft(layout, SPACECRAFT);
    expect(craft).toHaveLength(SPACECRAFT.length);
  });

  it("fits each planet's feature view on screen", () => {
    for (const p of layout.planets) {
      const f = computeFeaturePlacement(width, height, reachFactor(p.body.id));
      const values = Object.values(f).filter((v): v is number => typeof v === "number");
      for (const v of values) expect(Number.isFinite(v), p.body.id).toBe(true);
    }
  });
});
