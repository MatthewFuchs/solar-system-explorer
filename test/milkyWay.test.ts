import { describe, expect, it } from "vitest";
import { GALAXY_RADIUS_LY, LANDMARKS, SOL_IN_GALAXY, SUN_TO_CENTRE_LY } from "../src/data/milkyWay";
import { MILKY_WAY_PLATE, NEIGHBOURHOOD_PLATE, PLATES, plateById } from "../src/data/plates";
import { isSurfacePOI } from "../src/data/solarSystem";
import { bodyMark, bodyNoun, formatLy } from "../src/lib/format";
import { appearanceFor, DEEP_SKY_SPREAD } from "../src/scene/bodyAppearance";
import { armAngle, ARMS, galaxyStipple } from "../src/scene/galaxy";
import { hitRadius } from "../src/scene/layout/geometry";
import { longitudeAngle } from "../src/scene/layout/milkyWayPlate";
import { composePlate } from "../src/scene/layout/plates";
import { innerStage, outerStage, swapScale, type VoyageEnds } from "../src/scene/voyage";

const VIEWPORTS: [number, number][] = [
  [1440, 900],
  [1280, 800],
  [1366, 768],
  [768, 1024],
  [390, 844],
  [360, 740],
  [375, 667],
  [844, 390],
];
const DEG = Math.PI / 180;

describe("Milky Way data", () => {
  it("lists landmarks nearest the Sun first, each a deep-sky object with a real distance and direction", () => {
    const ly = LANDMARKS.map((b) => b.distanceLy!);
    expect([...ly].sort((a, b) => a - b)).toEqual(ly);
    for (const b of LANDMARKS) {
      expect(b.kind, b.id).toBe("deep-sky");
      expect(b.mark, b.id).toBeTruthy();
      expect(b.glon, b.id).toBeGreaterThanOrEqual(0);
      expect(b.glon, b.id).toBeLessThan(360);
      expect(Math.abs(b.glat!), b.id).toBeLessThan(90);
    }
  });

  it("puts the galaxy's black hole at its centre: the Sun's distance from it", () => {
    const sgr = LANDMARKS.find((b) => b.id === "sagittarius-a")!;
    expect(sgr.distanceLy).toBe(SUN_TO_CENTRE_LY);
    expect(Math.cos(sgr.glon! * DEG)).toBeCloseTo(1, 5);
  });

  it("gives every landmark at least three points of interest beside it, each with three facts and an https source", () => {
    for (const b of LANDMARKS) {
      expect(b.pois.length, b.id).toBeGreaterThanOrEqual(3);
      for (const poi of b.pois) {
        expect(isSurfacePOI(poi), poi.id).toBe(false);
        expect(poi.facts.length, poi.id).toBeGreaterThanOrEqual(3);
        expect(new URL(poi.source.url).protocol, poi.id).toBe("https:");
      }
    }
  });

  it("draws every landmark as a deep-sky object, and the Sun as the Sun", () => {
    for (const b of LANDMARKS) expect(appearanceFor(b.id).deepSky, b.id).toBeDefined();
    expect(appearanceFor(SOL_IN_GALAXY.id)).toBe(appearanceFor("sun"));
    expect(DEEP_SKY_SPREAD["black-hole"]).toBeLessThan(DEEP_SKY_SPREAD.nebula);
  });

  it("names what each landmark is, and writes long distances with thousands separators", () => {
    const crab = LANDMARKS.find((b) => b.id === "crab-nebula")!;
    expect(bodyMark(crab, 2)).toBe("Supernova remnant");
    expect(bodyNoun(crab, 2)).toBe("supernova remnant");
    expect(formatLy(27000)).toBe("27,000 ly");
    expect(formatLy(11.46)).toBe("11.5 ly");
  });

  it("links the neighbourhood and the galaxy both ways", () => {
    expect(plateById(NEIGHBOURHOOD_PLATE.outward!)).toBe(MILKY_WAY_PLATE);
    expect(plateById(MILKY_WAY_PLATE.inward!.plate)).toBe(NEIGHBOURHOOD_PLATE);
    expect(MILKY_WAY_PLATE.centre).toBe(SOL_IN_GALAXY);
    expect(PLATES.at(-1)).toBe(MILKY_WAY_PLATE);
  });
});

describe.each(VIEWPORTS)("Milky Way plate at %ix%i", (width, height) => {
  const layout = composePlate(MILKY_WAY_PLATE, width, height);
  const g = layout.galaxy!;
  const lyPerPx = GALAXY_RADIUS_LY / g.r;

  it("puts the Sun 27,000 light-years from the galaxy's centre", () => {
    expect(Math.hypot(layout.sun.x - g.x, layout.sun.y - g.y) * lyPerPx).toBeCloseTo(SUN_TO_CENTRE_LY, 3);
    expect(layout.star.body).toBe(SOL_IN_GALAXY);
  });

  it("sets each landmark at its real distance from the Sun, seen from above, in the direction of its longitude", () => {
    const towardCentre = Math.atan2(g.y - layout.sun.y, g.x - layout.sun.x);
    for (const p of layout.planets) {
      const d = Math.hypot(p.x - layout.sun.x, p.y - layout.sun.y) * lyPerPx;
      expect(d, p.body.id).toBeCloseTo(p.body.distanceLy! * Math.cos(p.body.glat! * DEG), 3);
      const a = Math.atan2(p.y - layout.sun.y, p.x - layout.sun.x);
      expect(Math.cos(a - longitudeAngle(p.body.glon!, towardCentre)), p.body.id).toBeCloseTo(1, 6);
    }
    const sgr = layout.planets.find((p) => p.body.id === "sagittarius-a")!;
    expect(Math.hypot(sgr.x - g.x, sgr.y - g.y)).toBeLessThan(1);
  });

  it("engraves rings every 10,000 light-years around the centre, inside the disc's rim", () => {
    const chart = layout.chart!;
    expect(chart.centre).toEqual({ x: g.x, y: g.y });
    expect(chart.rings.map((r) => Math.round(r.r * lyPerPx))).toEqual([10000, 20000, 30000, 40000]);
    expect(chart.dial).toBe(g.r);
    expect(chart.hours).toEqual([]);
  });

  it("keeps every landmark and label on screen, labels off the title and credit line", () => {
    for (const p of [layout.star, ...layout.planets]) {
      expect(p.x, p.body.id).toBeGreaterThan(0);
      expect(p.x, p.body.id).toBeLessThan(width);
      expect(p.labelBox.left, p.body.id).toBeGreaterThanOrEqual(0);
      expect(p.labelBox.right, p.body.id).toBeLessThanOrEqual(width);
      for (const area of layout.reserved) {
        const overlaps =
          p.labelBox.left < area.right && area.left < p.labelBox.right && p.labelBox.top < area.bottom && area.top < p.labelBox.bottom;
        expect(overlaps, `${p.body.id} label on a reserved area`).toBe(false);
      }
    }
  });

  it("keeps click targets apart, even for the Sun and the Orion Nebula, drawn a few pixels apart", () => {
    const bodies = [layout.star, ...layout.planets];
    for (const a of bodies) {
      for (const b of bodies) {
        if (a === b) continue;
        expect(hitRadius(a, bodies) + hitRadius(b, bodies), `${a.body.id}/${b.body.id}`).toBeLessThanOrEqual(Math.hypot(a.x - b.x, a.y - b.y) + 1e-9);
      }
    }
  });

  it("swaps plates on the voyage out from the neighbourhood while neither shows", () => {
    const inner = composePlate(NEIGHBOURHOOD_PLATE, width, height);
    const ends: VoyageEnds = {
      inner: { x: inner.sun.x, y: inner.sun.y, auPerPx: inner.auPerPx },
      outer: { x: layout.sun.x, y: layout.sun.y, auPerPx: layout.auPerPx },
    };
    const z = swapScale(ends);
    expect(innerStage(z, ends).opacity).toBe(0);
    expect(outerStage(z, ends).opacity).toBe(0);
  });

  it("scatters the galaxy's stars over its disc, the same on every load", () => {
    const a = galaxyStipple(g);
    expect(a.positions).toEqual(galaxyStipple(g).positions);
    expect(a.colors.length).toBe(a.positions.length);
    for (let i = 0; i < a.positions.length; i += 3) {
      expect(Math.hypot(a.positions[i] - g.x, a.positions[i + 1] - g.y)).toBeLessThan(g.r * 1.15);
    }
  });
});

describe("the spiral arms", () => {
  /** How far a point (by distance and longitude from the Sun) lies from an arm, in light-years. */
  function offArm(armName: string, b: { distanceLy?: number; glon?: number; glat?: number }) {
    const arm = ARMS.find((a) => a.name === armName)!;
    // The galaxy's own frame: the Sun straight below the centre (90 degrees, y down).
    const d = (b.distanceLy ?? 0) * Math.cos((b.glat ?? 0) * DEG);
    const a = longitudeAngle(b.glon ?? 0, -90 * DEG);
    const x = d * Math.cos(a);
    const y = SUN_TO_CENTRE_LY + d * Math.sin(a);
    const r = Math.hypot(x, y);
    const off = Math.atan2(y, x) / DEG - armAngle(arm, r);
    return Math.abs(((off + 540) % 360) - 180) * DEG * r;
  }
  const landmark = (id: string) => LANDMARKS.find((l) => l.id === id)!;

  it("runs the arms through the landmarks that belong to them, and the Sun on the Orion Spur", () => {
    expect(offArm("Perseus Arm", landmark("crab-nebula"))).toBeLessThan(500);
    expect(offArm("Sagittarius–Carina Arm", landmark("pillars-of-creation"))).toBeLessThan(2500);
    expect(offArm("Sagittarius–Carina Arm", landmark("carina-nebula"))).toBeLessThan(2500);
    // The Sun sits near the spur's inner edge, the Orion Nebula within it: both inside its spread.
    expect(offArm("Orion Spur", landmark("orion-nebula"))).toBeLessThan(1200);
    expect(offArm("Orion Spur", {})).toBeLessThan(1200);
  });
});
