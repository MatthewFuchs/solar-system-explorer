// The site's plates: each scale of the map (the solar system, and later the stellar
// neighbourhood, the Milky Way, the Local Group) is one fixed, art-directed composition.
// A plate's own words live here; its bodies' content lives in their data files.
import { NEIGHBOURS, SOL } from "./neighbourhood.ts";
import { BELTS, SITE, SPACECRAFT, VIEWABLE, type Belt, type CelestialBody, type Spacecraft } from "./solarSystem.ts";

export interface Plate {
  /** Stable id, used in code and CSS (`data-plate`). */
  id: string;
  /** Its URL segment ("" for the site's root). Unique across plates and bodies: URLs are flat. */
  path: string;
  /** The plate's title, bottom-left. Its last word breaks onto its own line on wide screens. */
  title: string;
  /** The introduction under the title. */
  intro: string;
  /** The tab title's second half, after the site name: what this plate is a map of. */
  tagline: string;
  /** One line for search results and link previews. */
  description: string;
  /** The body view's way back to this plate. */
  backLabel: string;
  /** The small credit line, bottom-right, for the plate's images. */
  credit: string;
  /** The plate one scale out, which holds this one. */
  outward?: string;
  /** The way one scale in: a point of light on this plate that opens a smaller plate. */
  inward?: { body: CelestialBody; plate: string };
  /** The plate's centre: the star its arcs are drawn around (on the solar plate, the Sun). */
  centre: CelestialBody;
  /** Every body with its own view on this plate, in reading order. */
  bodies: CelestialBody[];
  /** Stippled belts between bodies' orbits (solar plate). */
  belts?: Belt[];
  /** Spacecraft drawn beside their bodies (solar plate). */
  spacecraft?: Spacecraft[];
}

export const SOLAR_PLATE: Plate = {
  id: "solar",
  path: "",
  title: "The Solar System",
  intro:
    "A chart of the Sun's family, from the scorched to the frozen. Distances are in AU, the span from Earth to the Sun. Choose a world, and it will come to you.",
  tagline: "An interactive map of the solar system",
  description: SITE.description,
  backLabel: "Back to the system",
  credit: "Textures: Solar System Scope, CC BY 4.0. Pluto: NASA/JHUAPL/SwRI.",
  outward: "neighbourhood",
  centre: VIEWABLE[0],
  bodies: VIEWABLE,
  belts: BELTS,
  spacecraft: SPACECRAFT,
};

export const NEIGHBOURHOOD_PLATE: Plate = {
  id: "neighbourhood",
  path: "neighbourhood",
  title: "The Stellar Neighbourhood",
  intro:
    "Drawn to scale. Each ring is two light-years: the distance light crosses in two years. At this scale the whole solar system, out past Pluto, is far smaller than the point that marks the Sun. Choose a star.",
  tagline: "The Sun's nearest stars",
  description: "The stars nearest the Sun, drawn like a candlelit astrolabe: Alpha Centauri, Sirius, Barnard's Star and more, with their worlds and stories.",
  backLabel: "Back to the neighbourhood",
  credit: "Star surfaces: Solar System Scope, CC BY 4.0, recoloured.",
  inward: { body: SOL, plate: "solar" },
  centre: SOL,
  bodies: NEIGHBOURS,
};

/** Every plate, innermost first. */
export const PLATES: Plate[] = [SOLAR_PLATE, NEIGHBOURHOOD_PLATE];

export function plateById(id: string): Plate {
  const plate = PLATES.find((p) => p.id === id);
  if (!plate) throw new Error(`No plate "${id}"`);
  return plate;
}

/** The plate a body belongs to. */
export function plateOf(bodyId: string): Plate | undefined {
  return PLATES.find((p) => p.bodies.some((b) => b.id === bodyId));
}
