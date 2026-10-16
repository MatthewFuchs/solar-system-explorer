// How each body is rendered. This is presentation, not content: names, facts, and
// taglines stay in src/data/solarSystem.ts.
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

export const SUN_TEXTURE = textureUrl("sun.webp");

const APPEARANCE: Record<string, BodyAppearance> = {
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

export function appearanceFor(id: string): BodyAppearance {
  return APPEARANCE[id] ?? FALLBACK;
}

/** How far a body's visuals reach from its center, in planet radii (rings included). */
export function reachFactor(id: string): number {
  const ring = appearanceFor(id).ring;
  // A tilted ring's horizontal extent is a little under its outer radius.
  return ring ? ring.outer * 0.95 : 1;
}
