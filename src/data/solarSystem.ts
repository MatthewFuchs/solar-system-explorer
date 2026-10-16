// Stylized content for the solar system explorer.
// Sizes, distances, and speeds are tuned for UX/readability, NOT astronomically accurate.
// All planet and POI content lives here — components should never hardcode facts.

export type POICategory =
  | "geology"
  | "mission"
  | "atmosphere"
  | "moon"
  | "culture"
  | "ring"
  | "storm"
  | "surface";

export interface POI {
  id: string;
  name: string;
  /** Latitude on the body's surface, -90 (south pole) to 90 (north pole). */
  lat: number;
  /** Longitude on the body's surface, -180 to 180. */
  lon: number;
  category: POICategory;
  /** One-line summary shown in the POI list/marker tooltip. */
  summary: string;
  /** 3-5 short facts shown when the POI is opened. */
  facts: string[];
  /** Key measurements with real units, shown as data labels in the detail panel. */
  stats?: POIStat[];
  /** Optional illustration for the detail panel. Use only licensed images and credit them. */
  image?: POIImage;
  /** "Learn more" link shown in the detail panel. */
  source?: POISource;
}

export interface POIStat {
  label: string;
  /** Display value, e.g. "1,550" or "~22". */
  value: string;
  /** Unit shown after the value, e.g. "km" or "km/h". */
  unit?: string;
}

export interface POIImage {
  src: string;
  alt: string;
  credit?: string;
}

export interface POISource {
  label: string;
  url: string;
}

export interface CelestialBody {
  id: string;
  name: string;
  /** Hex color used for the stylized sphere/material. */
  color: string;
  /** Stylized display radius in scene units (not to scale). */
  displayRadius: number;
  /** Stylized orbit distance from the Sun in scene units. 0 for the Sun itself. */
  orbitDistance: number;
  /** Stylized orbit angular speed in radians/sec. 0 for the Sun itself. */
  orbitSpeed: number;
  /** Short one-line description shown under the body's name. */
  tagline: string;
  /** Mean distance from the Sun in astronomical units (real value, shown in labels). Omitted for the Sun. */
  distanceAU?: number;
  pois: POI[];
}

export const SUN: CelestialBody = {
  id: "sun",
  name: "Sun",
  color: "#ffd84a",
  displayRadius: 4,
  orbitDistance: 0,
  orbitSpeed: 0,
  tagline: "The star at the center of it all.",
  pois: [
    {
      id: "sun-flares",
      name: "Solar Flares",
      lat: 10,
      lon: 40,
      category: "atmosphere",
      summary: "Sudden bursts of radiation from the Sun's surface.",
      facts: [
        "Flares are classified by strength: A, B, C, M, and X, with X being the most intense.",
        "A major flare can release energy equivalent to millions of hydrogen bombs.",
        "Flares are often linked to sunspot activity and can disrupt radio communication on Earth.",
      ],
      source: { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Solar_flare" },
    },
  ],
};

export const PLANETS: CelestialBody[] = [
  {
    id: "mercury",
    name: "Mercury",
    color: "#9c9c9c",
    displayRadius: 0.6,
    orbitDistance: 8,
    orbitSpeed: 0.9,
    tagline: "The smallest and innermost planet.",
    distanceAU: 0.39,
    pois: [
      {
        id: "mercury-caloris",
        name: "Caloris Basin",
        lat: 30,
        lon: 160,
        category: "geology",
        summary: "One of the largest impact craters in the solar system.",
        facts: [
          "The basin is about 1,550 km across.",
          "It formed from an asteroid impact roughly 3.8 billion years ago.",
          "The impact was so powerful it caused unusual terrain on the opposite side of the planet.",
        ],
        stats: [
          { label: "Diameter", value: "1,550", unit: "km" },
          { label: "Age", value: "~3.8", unit: "billion years" },
        ],
        source: { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Caloris_Planitia" },
      },
    ],
  },
  {
    id: "venus",
    name: "Venus",
    color: "#e8c27a",
    displayRadius: 0.95,
    orbitDistance: 11,
    orbitSpeed: 0.7,
    tagline: "A scorched world hidden under thick clouds.",
    distanceAU: 0.72,
    pois: [
      {
        id: "venus-maxwell",
        name: "Maxwell Montes",
        lat: 65,
        lon: 5,
        category: "geology",
        summary: "The highest mountain range on Venus.",
        facts: [
          "Peaks rise about 11 km above Venus's average surface level.",
          "Named after physicist James Clerk Maxwell.",
          "Surface pressure there is still crushing by Earth standards.",
        ],
        stats: [
          { label: "Height", value: "11", unit: "km" },
          { label: "Length", value: "~850", unit: "km" },
        ],
        source: { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Maxwell_Montes" },
      },
    ],
  },
  {
    id: "earth",
    name: "Earth",
    color: "#3a7bd5",
    displayRadius: 1,
    orbitDistance: 15,
    orbitSpeed: 0.6,
    tagline: "Home.",
    distanceAU: 1.00,
    pois: [
      {
        id: "earth-iss",
        name: "ISS Overflight Zone",
        lat: 51.6,
        lon: 0,
        category: "mission",
        summary: "The orbital inclination path of the International Space Station.",
        facts: [
          "The ISS orbits Earth roughly every 90 minutes.",
          "It travels at about 28,000 km/h.",
          "It has been continuously occupied since November 2000.",
        ],
        stats: [
          { label: "Speed", value: "~28,000", unit: "km/h" },
          { label: "Orbit", value: "~90", unit: "min" },
          { label: "Altitude", value: "~400", unit: "km" },
          { label: "Inclination", value: "51.6", unit: "°" },
        ],
        source: { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/International_Space_Station" },
      },
      {
        id: "earth-amazon",
        name: "Amazon Rainforest",
        lat: -3,
        lon: -60,
        category: "geology",
        summary: "The largest tropical rainforest on Earth.",
        facts: [
          "It spans roughly 5.5 million square kilometers.",
          "It produces a significant share of the planet's oxygen.",
          "It's home to an estimated 10% of all known species.",
        ],
        stats: [
          { label: "Area", value: "~5.5 million", unit: "km²" },
          { label: "Known species", value: "~10", unit: "%" },
        ],
        source: { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Amazon_rainforest" },
      },
    ],
  },
  {
    id: "mars",
    name: "Mars",
    color: "#c1440e",
    displayRadius: 0.75,
    orbitDistance: 19,
    orbitSpeed: 0.48,
    tagline: "The red planet, long a target for exploration.",
    distanceAU: 1.52,
    pois: [
      {
        id: "mars-olympus-mons",
        name: "Olympus Mons",
        lat: 18,
        lon: -133,
        category: "geology",
        summary: "The largest volcano in the solar system.",
        facts: [
          "It stands about 22 km tall — nearly 2.5 times the height of Mount Everest.",
          "It's a shield volcano, similar in shape to Hawaiian volcanoes but vastly larger.",
          "Its base is roughly the size of the state of Arizona.",
        ],
        stats: [
          { label: "Height", value: "~22", unit: "km" },
          { label: "Base diameter", value: "~600", unit: "km" },
        ],
        source: { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Olympus_Mons" },
      },
      {
        id: "mars-perseverance",
        name: "Perseverance Landing Site",
        lat: 18.4,
        lon: 77.5,
        category: "mission",
        summary: "Jezero Crater, where NASA's Perseverance rover landed in 2021.",
        facts: [
          "Jezero Crater is believed to have once held a lake and river delta.",
          "Perseverance is searching for signs of ancient microbial life.",
          "The rover also carries samples intended for eventual return to Earth.",
        ],
        stats: [
          { label: "Landed", value: "Feb 18, 2021" },
          { label: "Crater diameter", value: "45", unit: "km" },
        ],
        source: { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Perseverance_(rover)" },
      },
    ],
  },
  {
    id: "jupiter",
    name: "Jupiter",
    color: "#d9a066",
    displayRadius: 2.6,
    orbitDistance: 28,
    orbitSpeed: 0.26,
    tagline: "The largest planet, a swirling giant of gas.",
    distanceAU: 5.20,
    pois: [
      {
        id: "jupiter-great-red-spot",
        name: "Great Red Spot",
        // The spot drifts in longitude over the years; this matches where it sits in
        // the Jupiter texture (public/textures), not a dated measurement.
        lat: -20,
        lon: -49,
        category: "atmosphere",
        summary: "A massive, centuries-old storm larger than Earth.",
        facts: [
          "Wind speeds inside the storm can exceed 400 km/h.",
          "It has been observed continuously for at least 150 years.",
          "The storm has been slowly shrinking over the past century.",
        ],
        stats: [
          { label: "Width (2017)", value: "16,350", unit: "km" },
          { label: "Peak winds", value: "~430", unit: "km/h" },
        ],
        source: { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Great_Red_Spot" },
      },
      {
        id: "jupiter-europa",
        name: "Europa",
        lat: 0,
        lon: 90,
        category: "moon",
        summary: "An icy moon thought to hide a liquid ocean beneath its surface.",
        facts: [
          "Its ice shell may be 15-25 km thick, covering an ocean deeper than any on Earth.",
          "It's considered one of the most promising places to search for extraterrestrial life.",
          "NASA's Europa Clipper mission is studying its habitability.",
        ],
        stats: [
          { label: "Diameter", value: "3,122", unit: "km" },
          { label: "Ice shell", value: "15–25", unit: "km" },
        ],
        source: { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Europa_(moon)" },
      },
    ],
  },
  {
    id: "saturn",
    name: "Saturn",
    color: "#e3c88a",
    displayRadius: 2.2,
    orbitDistance: 36,
    orbitSpeed: 0.19,
    tagline: "Famous for its sweeping ring system.",
    distanceAU: 9.58,
    pois: [
      {
        id: "saturn-rings",
        name: "The Ring System",
        lat: 0,
        lon: 0,
        category: "geology",
        summary: "A vast disk of ice and rock particles encircling the planet.",
        facts: [
          "The rings span up to 282,000 km across but are often less than 1 km thick.",
          "They're made mostly of water ice, with traces of rocky debris.",
          "Scientists believe the rings may be a relatively recent cosmic feature.",
        ],
        stats: [
          { label: "Span", value: "282,000", unit: "km" },
          { label: "Main-ring thickness", value: "~10", unit: "m" },
        ],
        source: { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Rings_of_Saturn" },
      },
    ],
  },
  {
    id: "uranus",
    name: "Uranus",
    color: "#9ad7d1",
    displayRadius: 1.6,
    orbitDistance: 43,
    orbitSpeed: 0.13,
    tagline: "An ice giant tilted almost on its side.",
    distanceAU: 19.2,
    pois: [
      {
        id: "uranus-axial-tilt",
        name: "Extreme Axial Tilt",
        lat: 0,
        lon: 0,
        category: "atmosphere",
        summary: "Uranus rotates almost on its side relative to its orbit.",
        facts: [
          "Its axial tilt is about 98 degrees, essentially rolling around the Sun.",
          "This causes extreme seasons, with each pole experiencing decades of continuous sunlight or darkness.",
          "The tilt is thought to be the result of an ancient, massive collision.",
        ],
        stats: [
          { label: "Axial tilt", value: "97.8", unit: "°" },
          { label: "Orbit", value: "84", unit: "years" },
        ],
        source: { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Uranus" },
      },
    ],
  },
  {
    id: "neptune",
    name: "Neptune",
    color: "#3b5ba9",
    displayRadius: 1.55,
    orbitDistance: 50,
    orbitSpeed: 0.1,
    tagline: "The farthest planet, battered by the solar system's fastest winds.",
    distanceAU: 30.07,
    pois: [
      {
        id: "neptune-winds",
        name: "Supersonic Winds",
        lat: -40,
        lon: 0,
        category: "atmosphere",
        summary: "Neptune hosts the fastest winds recorded on any planet.",
        facts: [
          "Wind speeds can reach over 2,100 km/h.",
          "Despite being farthest from the Sun, Neptune generates more internal heat than it receives.",
          "Its deep blue color comes from methane in its atmosphere.",
        ],
        stats: [
          { label: "Peak winds", value: "2,100", unit: "km/h" },
          { label: "Orbit", value: "165", unit: "years" },
        ],
        source: { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Neptune" },
      },
    ],
  },
];

export const SOLAR_SYSTEM: CelestialBody[] = [SUN, ...PLANETS];
