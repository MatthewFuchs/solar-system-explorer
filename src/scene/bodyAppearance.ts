// How each body is rendered. This is presentation, not content: names, facts, and
// taglines stay in src/data/solarSystem.ts.
import type { SpacecraftDrawing } from "../data/solarSystem";
import { textureUrl } from "./textures";

export interface RingAppearance {
  texture: string;
  /** Inner and outer ring radius, in planet radii. */
  inner: number;
  outer: number;
}

export interface BodyAppearance {
  texture: string;
  /** Full-size map, loaded when the planet view opens. */
  textureHd: string;
  /** Atmospheric rim color. */
  atmosphere: string;
  /** Rim glow strength (0 = airless). */
  rim: number;
  /** Starting rotation about the planet's axis, choosing which face looks at the viewer. */
  spin: number;
  /** Slow axial rotation in radians/sec; negative turns retrograde. Not real periods. */
  spinSpeed: number;
  /** Axial slant on screen, in radians. */
  tilt: number;
  ring?: RingAppearance;
}


const APPEARANCE: Record<string, BodyAppearance> = {
  // The Sun is emissive (no atmosphere or rim) and holds still; one texture serves both sizes.
  sun: { texture: textureUrl("sun.webp"), textureHd: textureUrl("sun.webp"), atmosphere: "#FFB24D", rim: 0, spin: 0.8, spinSpeed: 0, tilt: 0 },
  mercury: { texture: textureUrl("mercury.webp"), textureHd: textureUrl("2k/mercury.webp"), atmosphere: "#B8C2CC", rim: 0.18, spin: 0.6, spinSpeed: 0.015, tilt: 0.02 },
  venus: { texture: textureUrl("venus.webp"), textureHd: textureUrl("2k/venus.webp"), atmosphere: "#FFE2A8", rim: 0.75, spin: 0.2, spinSpeed: -0.012, tilt: 0.05 },
  earth: { texture: textureUrl("earth.webp"), textureHd: textureUrl("2k/earth.webp"), atmosphere: "#6FB2FF", rim: 0.95, spin: 0.9, spinSpeed: 0.05, tilt: 0.41 },
  mars: { texture: textureUrl("mars.webp"), textureHd: textureUrl("2k/mars.webp"), atmosphere: "#FF9E6E", rim: 0.4, spin: 1.8, spinSpeed: 0.048, tilt: 0.44 },
  jupiter: { texture: textureUrl("jupiter.webp"), textureHd: textureUrl("2k/jupiter.webp"), atmosphere: "#F2CFA4", rim: 0.55, spin: 0.4, spinSpeed: 0.095, tilt: 0.05 },
  saturn: {
    texture: textureUrl("saturn.webp"),
    textureHd: textureUrl("2k/saturn.webp"),
    atmosphere: "#F3E0B4",
    rim: 0.5,
    spin: 0,
    spinSpeed: 0.085,
    tilt: -0.32,
    ring: { texture: textureUrl("saturn-ring.webp"), inner: 1.24, outer: 2.15 },
  },
  uranus: { texture: textureUrl("uranus.webp"), textureHd: textureUrl("2k/uranus.webp"), atmosphere: "#A6F0F2", rim: 0.75, spin: 0, spinSpeed: -0.06, tilt: 0.3 },
  neptune: { texture: textureUrl("neptune.webp"), textureHd: textureUrl("2k/neptune.webp"), atmosphere: "#7FA2FF", rim: 0.85, spin: 0.5, spinSpeed: 0.065, tilt: 0.49 },
  // Pluto map: NASA/JHUAPL/SwRI New Horizons global mosaic (public domain); see public/textures/CREDITS.md.
  pluto: { texture: textureUrl("pluto.webp"), textureHd: textureUrl("2k/pluto.webp"), atmosphere: "#A9C2EE", rim: 0.3, spin: 0, spinSpeed: -0.02, tilt: 0.35 },
};

const FALLBACK: BodyAppearance = APPEARANCE.mercury;

/**
 * Orbit POIs that are drawn as objects in the planet view, keyed by POI id. Moons are lit
 * spheres; spacecraft are hairline drawings. Rings and the corona aren't listed: they are
 * part of the body's own visuals, so they keep a plain marker.
 */
export type OrbiterAppearance =
  | {
      kind: "moon";
      /** Equirectangular map; omit for a moon whose haze hides its surface (Titan). */
      texture?: string;
      /** Flat color used when there is no map. */
      color?: string;
      /** Stylized radius, in the planet's radii (not to scale). */
      radius: number;
      /** Longitude (on the map, left edge = -180°) turned toward the viewer. */
      face: number;
      /** Latitude tilted toward the viewer; Voyager saw only the south of Miranda and Triton. */
      faceLat?: number;
      atmosphere?: string;
      rim?: number;
    }
  | {
      kind: "craft";
      drawing: SpacecraftDrawing;
      /** Drawing size in CSS pixels. */
      size: number;
    };

const moonMap = (file: string) => textureUrl(`moons/${file}`);

const ORBITERS: Record<string, OrbiterAppearance> = {
  "mercury-messenger": { kind: "craft", drawing: "messenger", size: 46 },
  "earth-iss": { kind: "craft", drawing: "iss", size: 52 },
  // Tranquility Base is on the Moon, so the Moon itself is what you click.
  "earth-apollo-11": { kind: "moon", texture: moonMap("moon.webp"), radius: 0.17, face: 10 },
  "jupiter-io": { kind: "moon", texture: moonMap("io.webp"), radius: 0.075, face: -77 },
  "jupiter-europa": { kind: "moon", texture: moonMap("europa.webp"), radius: 0.065, face: 30 },
  "jupiter-ganymede": { kind: "moon", texture: moonMap("ganymede.webp"), radius: 0.09, face: -30 },
  // Titan's thick orange haze hides its surface from the outside, so it's drawn as haze.
  "saturn-titan": { kind: "moon", color: "#D9A44E", radius: 0.1, face: 0, atmosphere: "#F2B65E", rim: 0.9 },
  "saturn-enceladus": { kind: "moon", texture: moonMap("enceladus.webp"), radius: 0.06, face: 0, faceLat: -20 },
  "uranus-miranda": { kind: "moon", texture: moonMap("miranda.webp"), radius: 0.07, face: 0, faceLat: -45 },
  "neptune-triton": { kind: "moon", texture: moonMap("triton.webp"), radius: 0.11, face: 0, faceLat: -55 },
  // Charon is half Pluto's width, the largest moon relative to its world (drawn a little smaller to fit).
  "pluto-charon": { kind: "moon", texture: moonMap("charon.webp"), radius: 0.32, face: -30, faceLat: 20 },
};

export function orbiterFor(poiId: string): OrbiterAppearance | undefined {
  return ORBITERS[poiId];
}

export function appearanceFor(id: string): BodyAppearance {
  return APPEARANCE[id] ?? FALLBACK;
}

/** How far a body's visuals reach from its center, in planet radii (rings included). */
export function reachFactor(id: string): number {
  const ring = appearanceFor(id).ring;
  // A tilted ring's horizontal extent is a little under its outer radius.
  return ring ? ring.outer * 0.95 : 1;
}
