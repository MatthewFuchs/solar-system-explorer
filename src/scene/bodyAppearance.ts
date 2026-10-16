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
  /** Atmospheric rim color. */
  atmosphere: string;
  /** Rim glow strength (0 = airless). */
  rim: number;
  /** Rotation about the planet's axis, choosing which face looks at the viewer. */
  spin: number;
  /** Axial slant on screen, in radians. */
  tilt: number;
  ring?: RingAppearance;
}

export const SUN_TEXTURE = textureUrl("sun.jpg");

const APPEARANCE: Record<string, BodyAppearance> = {
  mercury: { texture: textureUrl("mercury.jpg"), atmosphere: "#B8C2CC", rim: 0.18, spin: 0.6, tilt: 0.02 },
  venus: { texture: textureUrl("venus.jpg"), atmosphere: "#FFE2A8", rim: 0.75, spin: 0.2, tilt: 0.05 },
  earth: { texture: textureUrl("earth.jpg"), atmosphere: "#6FB2FF", rim: 0.95, spin: 0.9, tilt: 0.41 },
  mars: { texture: textureUrl("mars.jpg"), atmosphere: "#FF9E6E", rim: 0.4, spin: 1.8, tilt: 0.44 },
  jupiter: { texture: textureUrl("jupiter.jpg"), atmosphere: "#F2CFA4", rim: 0.55, spin: 0.4, tilt: 0.05 },
  saturn: {
    texture: textureUrl("saturn.jpg"),
    atmosphere: "#F3E0B4",
    rim: 0.5,
    spin: 0,
    tilt: -0.32,
    ring: { texture: textureUrl("saturn-ring.png"), inner: 1.24, outer: 2.15 },
  },
  uranus: { texture: textureUrl("uranus.jpg"), atmosphere: "#A6F0F2", rim: 0.75, spin: 0, tilt: 0.3 },
  neptune: { texture: textureUrl("neptune.jpg"), atmosphere: "#7FA2FF", rim: 0.85, spin: 0.5, tilt: 0.49 },
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
