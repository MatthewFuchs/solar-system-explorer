import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BELTS, DESTINATIONS, PLANETS, SPACECRAFT, SUN, VIEWABLE, isSurfacePOI, type POIContent } from "../src/data/solarSystem";
import { appearanceFor, orbiterFor } from "../src/scene/bodyAppearance";

const publicDir = fileURLToPath(new URL("../public", import.meta.url));
/** A public URL such as "/textures/mars.webp" as a path on disk. */
const onDisk = (url: string) => publicDir + url.replace(/^\//, "/");

const allPois = VIEWABLE.flatMap((b) => b.pois.map((poi) => ({ body: b, poi })));
const allContent: POIContent[] = [...allPois.map((p) => p.poi), ...SPACECRAFT, ...BELTS];

describe("bodies", () => {
  it("has the Sun, eight planets in order, and unique ids", () => {
    expect(SUN.kind).toBe("star");
    expect(PLANETS.map((p) => p.id)).toEqual(["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"]);
    const ids = VIEWABLE.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses ids that work as URL hashes", () => {
    for (const b of VIEWABLE) expect(b.id).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it("gives every destination real orbital values", () => {
    for (const b of DESTINATIONS) {
      expect(b.distanceAU, b.id).toBeGreaterThan(0);
      expect(b.eccentricity, b.id).toBeGreaterThanOrEqual(0);
      expect(b.eccentricity, b.id).toBeLessThan(1);
    }
  });

  it("orders destinations outward from the Sun", () => {
    const au = DESTINATIONS.map((b) => b.distanceAU!);
    expect([...au].sort((a, b) => a - b)).toEqual(au);
  });

  it("gives every body at least one point of interest, surface points first", () => {
    for (const b of VIEWABLE) {
      expect(b.pois.length, b.id).toBeGreaterThan(0);
      const firstOrbit = b.pois.findIndex((p) => !isSurfacePOI(p));
      if (firstOrbit >= 0) expect(b.pois.slice(firstOrbit).every((p) => !isSurfacePOI(p)), b.id).toBe(true);
    }
  });
});

describe("points of interest", () => {
  it("have unique ids", () => {
    const ids = allContent.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("have a name, summary, facts, and an https source", () => {
    for (const c of allContent) {
      expect(c.name.trim(), c.id).not.toBe("");
      expect(c.summary.trim(), c.id).not.toBe("");
      expect(c.facts.length, c.id).toBeGreaterThan(0);
      for (const fact of c.facts) expect(fact.trim(), c.id).not.toBe("");
      expect(new URL(c.source.url).protocol, c.id).toBe("https:");
    }
  });

  it("keep surface coordinates on the globe", () => {
    for (const { poi } of allPois) {
      if (!isSurfacePOI(poi)) continue;
      expect(poi.lat, poi.id).toBeGreaterThanOrEqual(-90);
      expect(poi.lat, poi.id).toBeLessThanOrEqual(90);
      expect(poi.lon, poi.id).toBeGreaterThanOrEqual(-180);
      expect(poi.lon, poi.id).toBeLessThanOrEqual(180);
    }
  });

  it("never put a moon or spacecraft on the surface", () => {
    for (const { poi } of allPois) {
      if (isSurfacePOI(poi)) expect(poi.category, poi.id).not.toBe("moon");
      if (orbiterFor(poi.id)) expect(isSurfacePOI(poi), `${poi.id} is drawn as an object`).toBe(false);
    }
  });

  it("place orbit points beside the body", () => {
    for (const { poi } of allPois) {
      if (isSurfacePOI(poi)) continue;
      expect(poi.orbit.distance, poi.id).toBeGreaterThan(1);
    }
  });

  it("credit any images", () => {
    for (const c of allContent) if (c.image) expect(c.image.alt.trim(), c.id).not.toBe("");
  });
});

describe("spacecraft and belts", () => {
  const ids = new Set(VIEWABLE.map((b) => b.id));

  it("anchor spacecraft to real bodies", () => {
    for (const craft of SPACECRAFT) expect(ids.has(craft.placement.anchor), craft.id).toBe(true);
  });

  it("bound belts by real bodies", () => {
    for (const belt of BELTS) for (const id of belt.between) expect(ids.has(id), belt.id).toBe(true);
  });
});

describe("textures", () => {
  it("exist on disk for every body, ring, and moon", () => {
    const urls = VIEWABLE.flatMap((b) => {
      const a = appearanceFor(b.id);
      return [a.texture, a.textureHd, ...(a.ring ? [a.ring.texture] : [])];
    });
    for (const { poi } of allPois) {
      const orbiter = orbiterFor(poi.id);
      if (orbiter?.kind === "moon" && orbiter.texture) urls.push(orbiter.texture);
    }
    for (const url of urls) expect(existsSync(onDisk(url)), url).toBe(true);
  });

  it("are WebP", () => {
    for (const b of VIEWABLE) expect(appearanceFor(b.id).texture).toMatch(/\.webp$/);
  });

  it("give every body its own appearance", () => {
    const fallback = appearanceFor("no-such-body");
    for (const b of VIEWABLE) if (b.id !== "mercury") expect(appearanceFor(b.id), b.id).not.toBe(fallback);
  });
});
