// The observer's logbook: discoveries waiting to be made. Each has a clue (shown faintly in
// the logbook until it's found), an entry (shown once it is), and a trigger: what the visitor
// must do. Facts in entries are checked like any content (sources in the comments).
import { NEIGHBOURS } from "./neighbourhood.ts";
import { PLANETS } from "./solarSystem.ts";

export type Trigger =
  /** Open any one of these pages (body ids, or "plate:<id>" for a plate). */
  | { kind: "visited-any"; ids: string[] }
  /** Open every one of them. */
  | { kind: "visited-all"; ids: string[] }
  /** Open the details of this many points of interest, spacecraft, or belts. */
  | { kind: "read-count"; min: number }
  /** An easter egg: found by doing something particular, which calls journey.discover(id). */
  | { kind: "secret" };

export interface Mystery {
  id: string;
  title: string;
  /** A hint, shown until it's found. */
  clue: string;
  /** What the logbook says once it's found. */
  entry: string;
  trigger: Trigger;
  /** Shown large for a moment when it's found, above the "Noted in your logbook" line. */
  reveal?: string;
}

export const MYSTERIES: Mystery[] = [
  {
    id: "beyond-the-sun",
    title: "Beyond the Sun",
    clue: "Past the last of the Sun's worlds, other suns are waiting.",
    // Alpha Centauri, 4.37 light-years (neighbourhood.ts, Pourbaix & Boffin 2016).
    entry: "You have stood beside another star. Even the nearest, Alpha Centauri, sends us light that set out more than four years ago.",
    trigger: { kind: "visited-any", ids: NEIGHBOURS.map((s) => s.id) },
  },
  {
    id: "grand-tour",
    title: "The Grand Tour",
    clue: "Call on every world that circles the Sun, from the scorched to the frozen.",
    // NASA, Voyager 2: the only spacecraft to visit Uranus and Neptune.
    entry: "Every planet visited, Mercury to Neptune. Of all our spacecraft, only Voyager 2 has been to Uranus and Neptune.",
    trigger: { kind: "visited-all", ids: PLANETS.map((p) => p.id) },
  },
  {
    id: "well-read",
    title: "Well Read",
    clue: "Linger a while, and read what the worlds have to say.",
    entry: "A dozen stories read. Every one of them was learned by someone looking up, and asking.",
    trigger: { kind: "read-count", min: 12 },
  },
  {
    id: "edge-of-the-map",
    title: "The Edge of the Map",
    clue: "Go as far out as this map reaches.",
    // NASA: the galaxy probably holds 100 to 400 billion stars.
    entry: "From here, the Sun is one star among a hundred to four hundred billion, and everything you have seen lies within its point of light.",
    trigger: { kind: "visited-any", ids: ["plate:milky-way"] },
  },
  {
    id: "heart-of-the-galaxy",
    title: "The Heart of the Galaxy",
    clue: "Everything in the galaxy turns about one dark point.",
    // ESO eso2208: four million times the Sun's mass.
    entry: "You have looked into the centre of the Milky Way: four million Suns' worth of mass, seen only as a shadow inside a ring of light.",
    trigger: { kind: "visited-any", ids: ["sagittarius-a"] },
  },
  // ---------- Easter eggs ----------
  {
    id: "pale-blue-dot",
    title: "The Pale Blue Dot",
    clue: "From far away, look back toward home, and wait a while.",
    // NASA Photojournal, "Solar System Portrait: Earth as 'Pale Blue Dot'".
    reveal: "Voyager 1, six billion kilometres out, 14 February 1990: Earth less than a pixel across.",
    entry: "You lingered over the Sun from among the stars. Voyager 1 once looked back from six billion kilometres away; in its photograph, Earth fills 0.12 of one pixel.",
    trigger: { kind: "secret" },
  },
  {
    id: "music-of-the-spheres",
    title: "Music of the Spheres",
    clue: "With sound on, let the worlds sing in their order, outward from the Sun.",
    reveal: "Mercury to Neptune, sung in order: the harmony of the worlds.",
    entry: "Kepler believed the planets sang together. You heard all eight, nearest to farthest, and then all at once.",
    trigger: { kind: "secret" },
  },
  {
    id: "kepler",
    title: "Kepler",
    clue: "Speak the name of the man who heard the planets sing.",
    // Kepler, Harmonices Mundi (1619): the first statement of his third law.
    reveal: "Johannes Kepler, 1619: the square of a planet's year is as the cube of its distance from the Sun.",
    entry: "In Harmonices Mundi, the book in which he heard the worlds sing, Kepler also set down his third law: a planet's year, squared, keeps step with its distance, cubed.",
    trigger: { kind: "secret" },
  },
  {
    id: "hubble",
    title: "Hubble",
    clue: "Speak the name of the astronomer who found the universe growing.",
    // Hubble 1929, PNAS 15, 168: more distant galaxies recede faster.
    reveal: "Edwin Hubble, 1929: the farther a galaxy, the faster it is carried away.",
    entry: "In 1929 Edwin Hubble showed that galaxies are moving away from us, the more distant ones faster: the first great sign that the universe is expanding.",
    trigger: { kind: "secret" },
  },
];

/** The names that, typed anywhere, are easter eggs: name → mystery id. */
export const SPOKEN_NAMES: Record<string, string> = { KEPLER: "kepler", HUBBLE: "hubble" };
