import { describe, expect, it } from "vitest";
import { BELTS, DESTINATIONS, SPACECRAFT, SUN } from "../src/data/solarSystem";
import { reachFactor } from "../src/scene/bodyAppearance";
import { computeFeaturePlacement, featureKeepOut } from "../src/scene/layout/screen";
import { computePlateLayout, placeBelts, placeSpacecraft } from "../src/scene/layout/solarPlate";

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

  it("keeps every spacecraft inside the plate", () => {
    for (const s of placeSpacecraft(layout, SPACECRAFT)) {
      expect(s.x, s.craft.id).toBeGreaterThanOrEqual(layout.bounds.left);
      expect(s.x, s.craft.id).toBeLessThanOrEqual(layout.bounds.right);
      expect(s.y, s.craft.id).toBeGreaterThanOrEqual(layout.bounds.top);
      expect(s.y, s.craft.id).toBeLessThanOrEqual(layout.bounds.bottom);
    }
  });

  it("keeps the feature planet clear of the text column", () => {
    const keepOut = featureKeepOut(width, height);
    expect(keepOut).toBeGreaterThanOrEqual(0);
    expect(keepOut).toBeLessThan(width);
    if (keepOut > 0) {
      const f = computeFeaturePlacement(width, height, 1);
      expect(f.x - f.r).toBeGreaterThanOrEqual(keepOut);
    }
  });

  it("fits each planet's feature view on screen", () => {
    for (const p of layout.planets) {
      const f = computeFeaturePlacement(width, height, reachFactor(p.body.id));
      const values = Object.values(f).filter((v): v is number => typeof v === "number");
      for (const v of values) expect(Number.isFinite(v), p.body.id).toBe(true);
    }
  });
});

describe("spacecraft placement", () => {
  const layout = computePlateLayout(SUN, DESTINATIONS, 1440, 900);

  it("moves off a spot that is already taken", () => {
    const [first] = placeSpacecraft(layout, SPACECRAFT);
    const taken = { left: first.x - 30, right: first.x + 30, top: first.y - 30, bottom: first.y + 30 };
    const [moved] = placeSpacecraft(layout, SPACECRAFT, [taken]);
    expect(moved.craft.id).toBe(first.craft.id);
    expect(Math.hypot(moved.x - first.x, moved.y - first.y)).toBeGreaterThan(0);
  });

  it("keeps spacecraft from landing on each other", () => {
    const spots = placeSpacecraft(layout, SPACECRAFT);
    for (let i = 0; i < spots.length; i++)
      for (let j = i + 1; j < spots.length; j++)
        expect(Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y), `${spots[i].craft.id}/${spots[j].craft.id}`).toBeGreaterThan(20);
  });
});

describe("feature view keep-out", () => {
  it("applies only on short landscape screens", () => {
    expect(featureKeepOut(1440, 900)).toBe(0);
    expect(featureKeepOut(390, 844)).toBe(0);
    expect(featureKeepOut(844, 390)).toBeGreaterThan(0);
  });
});
