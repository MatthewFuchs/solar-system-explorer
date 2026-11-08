// Content for the solar system explorer.
// Display sizes, orbit distances, and speeds are tuned for UX/readability, NOT to scale.
// Everything else here (facts, stats, distances in AU, coordinates) aims to be accurate.
// All planet and POI content lives here — components should never hardcode facts.

export type POICategory =
  | "geology"
  | "mission"
  | "atmosphere"
  | "moon"
  | "culture"
  | "ring"
  | "storm"
  | "surface"
  | "star"
  | "planet"
  | "disk"
  | "nebula"
  | "cluster"
  | "black hole"
  | "history";

/** A measurement with real units, shown as a small data label. */
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

/** The content every point of interest shares; spacecraft and belts use it too. */
export interface POIContent {
  id: string;
  name: string;
  category: POICategory;
  /** One-line summary shown in the planet view column and the detail panel. */
  summary: string;
  /** 3-5 short facts shown in the detail panel. */
  facts: string[];
  /** Key measurements with real units, shown as data labels in the detail panel. */
  stats?: POIStat[];
  /** Optional illustration for the detail panel. Use only licensed images and credit them. */
  image?: POIImage;
  /** "Learn more" link: a NASA or other authoritative page. */
  source: POISource;
}

/**
 * A place on the body's surface. Coordinates must match where the feature appears in
 * the body's texture (equirectangular, left edge = -180°, east positive).
 */
export interface SurfacePOI extends POIContent {
  /** Latitude, -90 (south pole) to 90 (north pole). */
  lat: number;
  /** Longitude, -180 to 180, east positive. */
  lon: number;
}

/**
 * Something near the body rather than on it (a moon, a ring, a spacecraft). Its marker
 * floats beside the planet in the planet view.
 */
export interface OrbitPOI extends POIContent {
  orbit: {
    /** Screen angle in degrees, counterclockwise from the right (90 = above the planet). */
    angle: number;
    /** Distance from the planet's center, in planet radii. */
    distance: number;
  };
}

export type POI = SurfacePOI | OrbitPOI;

export function isSurfacePOI(poi: POI): poi is SurfacePOI {
  return "lat" in poi;
}

export interface CelestialBody {
  id: string;
  name: string;
  /**
   * Stars (the Sun and its neighbours); dwarf planets get a destination but no Roman numeral;
   * deep-sky objects (nebulae, clusters, black holes) are drawn as clouds of light. Defaults to planet.
   */
  kind?: "star" | "planet" | "dwarf" | "deep-sky";
  /** What a deep-sky object is ("Nebula", "Black hole"), shown in place of a numeral. */
  mark?: string;
  /** Hex color used for the stylized sphere/material. */
  color: string;
  /** Stylized display radius in scene units (not to scale). */
  displayRadius: number;
  /** Stylized orbit distance from the Sun in scene units. 0 for the Sun itself. */
  orbitDistance: number;
  /** Stylized orbit angular speed in radians/sec. 0 for the Sun itself. */
  orbitSpeed: number;
  /** Its Wikipedia article, which tells search engines which body a page is about. */
  wikipedia: string;
  /** Short one-line description shown under the body's name. */
  tagline: string;
  /** Mean distance from the Sun in astronomical units (real value, shown in labels). Omitted for the Sun. */
  distanceAU?: number;
  /** Distance from the Sun in light-years (real value), for stars beyond it. */
  distanceLy?: number;
  /** Spectral class (real value, e.g. "M5.5V"), shown in place of a numeral for other stars. */
  spectralType?: string;
  /** Right ascension in hours (real value, J2000): the star's direction around the neighbourhood chart. */
  ra?: number;
  /** Galactic longitude in degrees (real value): its direction from the Sun across the Milky Way plate. */
  glon?: number;
  /** Galactic latitude in degrees (real value): how far above or below the galaxy's plane it lies. */
  glat?: number;
  /** How stretched the orbit is (real value, 0 = a circle). Sets the planet's song: how far its
      pitch rises from the far end of its orbit to the near end, as Kepler heard it. */
  eccentricity?: number;
  /** One or two headline measurements (real values), shown with the planet's label. */
  stats?: POIStat[];
  /** Surface points first: the planet view opens facing the first POI. */
  pois: POI[];
}

/** The site's own words. Each plate's title and introduction live in plates.ts. */
export const SITE = {
  name: "Solar System Explorer",
  /** One line for search results and link previews. */
  description: "An interactive map of the solar system, drawn like a candlelit astrolabe. Fly to each world and read its stories.",
};

const NASA = (url: string): POISource => ({ label: "NASA", url });

export const SUN: CelestialBody = {
  id: "sun",
  name: "Sun",
  wikipedia: "https://en.wikipedia.org/wiki/Sun",
  kind: "star",
  color: "#ffd84a",
  displayRadius: 4,
  orbitDistance: 0,
  orbitSpeed: 0,
  tagline: "The star at the center of it all.",
  stats: [
    { label: "Diameter", value: "1,392,700", unit: "km" },
    { label: "Surface", value: "~5,500", unit: "°C" },
  ],
  pois: [
    {
      id: "sun-sunspots",
      name: "Sunspots",
      lat: 15,
      lon: 20,
      category: "surface",
      summary: "Dark patches where tangled magnetic fields hold back the Sun's heat.",
      facts: [
        "Sunspots only look dark by comparison: at roughly 3,500 °C they are cooler than the surface around them, yet still hotter than molten lava.",
        "Their numbers swell and fade over a cycle of about 11 years, a rhythm astronomers have followed since the early 1600s.",
        "A large sunspot can be wider than Earth.",
        "They are where solar flares are born, when twisted magnetic fields snap and release their stored energy.",
      ],
      stats: [
        { label: "Temperature", value: "~3,500", unit: "°C" },
        { label: "Cycle", value: "~11", unit: "years" },
      ],
      source: NASA("https://science.nasa.gov/sun/sunspots/"),
    },
    {
      id: "sun-flares",
      name: "Solar Flares",
      lat: 10,
      lon: 40,
      category: "storm",
      summary: "Sudden flashes of light and radiation, the most powerful explosions in the solar system.",
      facts: [
        "The biggest flares release as much energy as a billion hydrogen bombs.",
        "Flares are ranked in classes A, B, C, M, and X, each ten times stronger than the one before.",
        "Their light reaches Earth in about eight minutes, fast enough to disrupt radio and GPS before any warning could arrive.",
      ],
      source: NASA("https://science.nasa.gov/sun/solar-storms-and-flares/"),
    },
    {
      id: "sun-corona",
      name: "The Corona",
      orbit: { angle: 45, distance: 1.3 },
      category: "atmosphere",
      summary: "The Sun's outer atmosphere, a pale crown seen by eye only during a total eclipse.",
      facts: [
        "The corona burns at more than a million degrees Celsius, hundreds of times hotter than the surface beneath it, and why is still one of solar physics' great puzzles.",
        "It streams endlessly outward as the solar wind, filling the solar system with charged particles.",
        "In 2021 NASA's Parker Solar Probe became the first spacecraft to fly through it.",
      ],
      stats: [{ label: "Temperature", value: "> 1 million", unit: "°C" }],
      source: NASA("https://science.nasa.gov/sun/facts/"),
    },
  ],
};

export const PLANETS: CelestialBody[] = [
  {
    id: "mercury",
    name: "Mercury",
    wikipedia: "https://en.wikipedia.org/wiki/Mercury_(planet)",
    color: "#9c9c9c",
    displayRadius: 0.6,
    orbitDistance: 8,
    orbitSpeed: 0.9,
    tagline: "The smallest and innermost planet.",
    distanceAU: 0.39,
    eccentricity: 0.2056,
    stats: [
      { label: "Diameter", value: "4,879", unit: "km" },
      { label: "Day", value: "176", unit: "Earth days" },
    ],
    pois: [
      {
        id: "mercury-caloris",
        name: "Caloris Basin",
        lat: 30.5,
        lon: 162.7,
        category: "geology",
        summary: "One of the largest impact basins in the solar system, ringed by mountains.",
        facts: [
          "An asteroid struck here about 3.8 billion years ago, leaving a basin some 1,550 km across.",
          "The shock waves converged on the far side of the planet and heaved up a jumble of hills known as the 'weird terrain'.",
          "Lava later flooded its floor, leaving it smoother and paler than the battered plains around it.",
          "Its name is Latin for heat: it lies near one of Mercury's 'hot poles', where the Sun blazes overhead at the planet's closest approach.",
        ],
        stats: [
          { label: "Diameter", value: "~1,550", unit: "km" },
          { label: "Age", value: "~3.8", unit: "billion years" },
        ],
        source: NASA("https://science.nasa.gov/mercury/facts/"),
      },
      {
        id: "mercury-polar-ice",
        name: "Ice in the Shadows",
        lat: 85.8,
        lon: -62.9,
        category: "geology",
        summary: "Water ice hiding in craters the Sun never reaches, on the planet closest to it.",
        facts: [
          "Mercury's axis is barely tilted, so the floors of some polar craters have stayed in darkness for billions of years.",
          "Radar from Earth first hinted at ice here in 1991; NASA's MESSENGER spacecraft confirmed it two decades later.",
          "Estimates put the total between 100 billion and 1 trillion tonnes.",
          "Prokofiev, the largest of these ice-holding craters, sits close to the north pole.",
        ],
        stats: [{ label: "Estimated ice", value: "0.1–1", unit: "trillion tonnes" }],
        source: NASA("https://science.nasa.gov/mercury/facts/"),
      },
      {
        id: "mercury-messenger",
        name: "MESSENGER",
        orbit: { angle: 120, distance: 1.25 },
        category: "mission",
        summary: "The first spacecraft to orbit Mercury, and the one that mapped it whole.",
        facts: [
          "It circled the planet more than 4,000 times between 2011 and 2015.",
          "It mapped the entire surface, confirmed the polar ice, and found Mercury unexpectedly rich in volatile elements such as sulfur and potassium.",
          "Out of fuel, it ended its mission by striking the surface in April 2015, leaving one more crater behind.",
        ],
        stats: [
          { label: "In orbit", value: "2011–2015" },
          { label: "Orbits", value: "4,000+" },
        ],
        source: NASA("https://science.nasa.gov/mission/messenger/"),
      },
    ],
  },
  {
    id: "venus",
    name: "Venus",
    wikipedia: "https://en.wikipedia.org/wiki/Venus",
    color: "#e8c27a",
    displayRadius: 0.95,
    orbitDistance: 11,
    orbitSpeed: 0.7,
    tagline: "A scorched world hidden under thick clouds.",
    distanceAU: 0.72,
    eccentricity: 0.0068,
    stats: [
      { label: "Diameter", value: "12,104", unit: "km" },
      { label: "Day", value: "243", unit: "Earth days" },
    ],
    pois: [
      {
        id: "venus-maxwell",
        name: "Maxwell Montes",
        lat: 65.2,
        lon: 3.3,
        category: "geology",
        summary: "The highest mountains on Venus, hidden beneath a permanent ceiling of cloud.",
        facts: [
          "Its summit rises about 11 km above the planet's average surface, higher than Everest stands above the sea.",
          "It is the only feature on Venus named for a man, the physicist James Clerk Maxwell; nearly all others honor women and goddesses.",
          "Its peaks shine brightly in radar, perhaps coated in a metallic frost condensed from the scorching air.",
        ],
        stats: [
          { label: "Height", value: "~11", unit: "km" },
          { label: "Length", value: "~850", unit: "km" },
        ],
        source: NASA("https://science.nasa.gov/venus/venus-facts/"),
      },
      {
        id: "venus-maat-mons",
        name: "Maat Mons",
        lat: 0.5,
        lon: -165.4,
        category: "geology",
        summary: "Venus's tallest volcano, and one that may still be stirring.",
        facts: [
          "It rises about 8 km above the planet's average surface.",
          "In 2023, scientists comparing radar images taken months apart by NASA's Magellan in 1991 found a vent on its flank that had changed shape: the first direct sign of recent volcanic activity on Venus.",
          "Magellan mapped nearly the whole planet by radar, seeing through clouds no telescope can pierce.",
        ],
        stats: [{ label: "Height", value: "~8", unit: "km" }],
        source: NASA("https://science.nasa.gov/mission/magellan/"),
      },
      {
        id: "venus-clouds",
        name: "The Racing Clouds",
        lat: 10,
        lon: -90,
        category: "atmosphere",
        summary: "A shroud of acid cloud that circles the planet far faster than the planet turns.",
        facts: [
          "Venus turns so slowly that its day outlasts its year, yet its cloud tops sweep around the planet in about four Earth days.",
          "The clouds are made largely of sulfuric acid droplets.",
          "Beneath them the carbon dioxide air presses down at about 92 times Earth's sea-level pressure.",
          "That blanket traps so much heat that the surface holds near 465 °C, hot enough to melt lead.",
        ],
        stats: [
          { label: "Surface", value: "~465", unit: "°C" },
          { label: "Pressure", value: "~92", unit: "bar" },
        ],
        source: NASA("https://science.nasa.gov/venus/venus-facts/"),
      },
    ],
  },
  {
    id: "earth",
    name: "Earth",
    wikipedia: "https://en.wikipedia.org/wiki/Earth",
    color: "#3a7bd5",
    displayRadius: 1,
    orbitDistance: 15,
    orbitSpeed: 0.6,
    tagline: "Home.",
    distanceAU: 1.0,
    eccentricity: 0.0167,
    stats: [
      { label: "Diameter", value: "12,742", unit: "km" },
      { label: "Day", value: "24", unit: "hours" },
    ],
    pois: [
      {
        id: "earth-mariana",
        name: "Mariana Trench",
        lat: 11.35,
        lon: 142.2,
        category: "geology",
        summary: "The deepest place in the ocean, a crescent-shaped scar in the western Pacific.",
        facts: [
          "At Challenger Deep it plunges nearly 11,000 meters, deeper than Everest is tall.",
          "Here the Pacific plate dives beneath the Mariana plate, dragging the seafloor down into the mantle.",
          "The first people to reach the bottom were Jacques Piccard and Don Walsh, aboard the bathyscaphe Trieste in 1960.",
          "The water above presses down with more than 1,000 times the pressure at the surface.",
        ],
        stats: [
          { label: "Deepest point", value: "~10,900", unit: "m" },
          { label: "Length", value: "~2,550", unit: "km" },
        ],
        source: { label: "NOAA", url: "https://oceanservice.noaa.gov/facts/oceandepth.html" },
      },
      {
        id: "earth-amazon",
        name: "Amazon Rainforest",
        lat: -3,
        lon: -60,
        category: "surface",
        summary: "Earth's largest rainforest, a forest that makes its own weather.",
        facts: [
          "The Amazon basin spans at least 6 million square kilometers, nearly twice the size of India, across eight countries; rainforest covers about 80 percent of it.",
          "It is home to about one-fifth of the world's land species, many found nowhere else, and to more than 30 million people.",
          "Its trees breathe out so much water vapor that they start their own rainy season, a finding drawn from NASA satellite measurements.",
          "That is why clearing the forest is linked to less rain in the region.",
        ],
        stats: [
          { label: "Basin", value: "6+ million", unit: "km²" },
          { label: "Land species", value: "~1 in 5" },
        ],
        source: NASA("https://science.nasa.gov/earth/earth-observatory/mapping-the-amazon-145649/"),
      },
      {
        id: "earth-iss",
        name: "International Space Station",
        orbit: { angle: 70, distance: 1.12 },
        category: "mission",
        summary: "A laboratory the size of a football field, circling about 400 km overhead.",
        facts: [
          "It circles Earth about every 90 minutes, so its crew sees around 16 sunrises a day.",
          "It travels at about 28,000 km/h.",
          "People have lived aboard without a break since November 2000.",
          "From end to end it spans about 109 meters.",
        ],
        stats: [
          { label: "Altitude", value: "~400", unit: "km" },
          { label: "Speed", value: "~28,000", unit: "km/h" },
          { label: "Orbit", value: "~90", unit: "min" },
        ],
        source: NASA("https://www.nasa.gov/international-space-station/"),
      },
      {
        id: "earth-apollo-11",
        name: "Tranquility Base",
        orbit: { angle: 235, distance: 1.3 },
        category: "mission",
        summary: "On the Moon's Sea of Tranquility, where humans first stood on another world.",
        facts: [
          "Neil Armstrong and Buzz Aldrin landed the lunar module Eagle here on July 20, 1969, while Michael Collins circled overhead.",
          "They walked the surface for about two and a half hours and brought home 21.5 kilograms of rock and dust.",
          "With no wind or rain to disturb it, their footprints are likely still there.",
          "The Moon itself lies about 384,400 km away, and drifts about 3.8 cm farther every year.",
        ],
        stats: [
          { label: "Landing", value: "July 20, 1969" },
          { label: "Moon's distance", value: "384,400", unit: "km" },
        ],
        source: NASA("https://www.nasa.gov/mission/apollo-11/"),
      },
    ],
  },
  {
    id: "mars",
    name: "Mars",
    wikipedia: "https://en.wikipedia.org/wiki/Mars",
    color: "#c1440e",
    displayRadius: 0.75,
    orbitDistance: 19,
    orbitSpeed: 0.48,
    tagline: "The red planet, long a target for exploration.",
    distanceAU: 1.52,
    eccentricity: 0.0934,
    stats: [
      { label: "Diameter", value: "6,779", unit: "km" },
      { label: "Day", value: "24.6", unit: "hours" },
    ],
    pois: [
      {
        id: "mars-olympus-mons",
        name: "Olympus Mons",
        lat: 18.65,
        lon: -133.8,
        category: "geology",
        summary: "The largest volcano in the solar system.",
        facts: [
          "It stands nearly 22 km tall, about two and a half times the height of Everest.",
          "Its base is roughly 600 km across, about the size of the state of Arizona.",
          "It is a shield volcano, built from lava that flowed gently for ages, like Hawaii's but vastly larger.",
          "Its slopes are so gradual that, standing on its flanks, the summit would lie beyond the horizon.",
        ],
        stats: [
          { label: "Height", value: "~22", unit: "km" },
          { label: "Base diameter", value: "~600", unit: "km" },
        ],
        source: NASA("https://science.nasa.gov/mars/facts/"),
      },
      {
        id: "mars-valles-marineris",
        name: "Valles Marineris",
        lat: -14,
        lon: -59,
        category: "geology",
        summary: "A canyon system long enough to span the United States.",
        facts: [
          "It stretches more than 4,000 km and plunges as deep as 7 km.",
          "It was not carved by a river: the crust itself split apart, and landslides and erosion widened the wound.",
          "It is named for Mariner 9, the orbiter that revealed it in 1971 and 1972.",
        ],
        stats: [
          { label: "Length", value: "4,000+", unit: "km" },
          { label: "Depth", value: "up to 7", unit: "km" },
        ],
        source: NASA("https://science.nasa.gov/mission/mariner-9/"),
      },
      {
        id: "mars-perseverance",
        name: "Jezero Crater",
        lat: 18.38,
        lon: 77.58,
        category: "mission",
        summary: "An ancient lakebed where NASA's Perseverance rover is searching for signs of past life.",
        facts: [
          "Jezero once held a lake, fed by a river that left a fan-shaped delta still visible from orbit.",
          "Perseverance touched down here on February 18, 2021.",
          "The rover is sealing rock samples in tubes for a future mission to bring back to Earth.",
          "It carried the Ingenuity helicopter, which made the first powered, controlled flight on another planet.",
        ],
        stats: [
          { label: "Landed", value: "Feb 18, 2021" },
          { label: "Crater diameter", value: "~45", unit: "km" },
        ],
        source: NASA("https://science.nasa.gov/mission/mars-2020-perseverance/"),
      },
      {
        id: "mars-hellas",
        name: "Hellas Basin",
        lat: -42.4,
        lon: 70.5,
        category: "geology",
        summary: "A vast impact basin, the lowest ground on Mars.",
        facts: [
          "It is about 2,300 km across, one of the largest impact craters in the solar system.",
          "Its floor lies some 7 km below the planet's average surface level.",
          "Down there the air is densest on Mars, enough that liquid water might briefly survive before boiling away.",
        ],
        stats: [
          { label: "Diameter", value: "~2,300", unit: "km" },
          { label: "Depth", value: "~7", unit: "km" },
        ],
        source: NASA("https://science.nasa.gov/mars/facts/"),
      },
    ],
  },
  {
    id: "jupiter",
    name: "Jupiter",
    wikipedia: "https://en.wikipedia.org/wiki/Jupiter",
    color: "#d9a066",
    displayRadius: 2.6,
    orbitDistance: 28,
    orbitSpeed: 0.26,
    tagline: "The largest planet, a swirling giant of gas.",
    distanceAU: 5.2,
    eccentricity: 0.0489,
    stats: [
      { label: "Diameter", value: "139,820", unit: "km" },
      { label: "Day", value: "9.9", unit: "hours" },
    ],
    pois: [
      {
        id: "jupiter-great-red-spot",
        name: "Great Red Spot",
        // The spot drifts in longitude over the years; this matches where it sits in
        // the Jupiter texture (public/textures), not a dated measurement.
        lat: -20,
        lon: -49,
        category: "storm",
        summary: "A storm wider than Earth that has raged for centuries.",
        facts: [
          "It has been watched continuously since the 1830s, and may be the same spot astronomers saw in the 1660s.",
          "Winds around its edge reach about 430 km/h.",
          "It is shrinking: in the late 1800s it could have held about three Earths side by side; today it holds barely one.",
          "NASA's Juno found that its roots reach some 500 km down into Jupiter's atmosphere.",
        ],
        stats: [
          { label: "Width (2017)", value: "16,350", unit: "km" },
          { label: "Peak winds", value: "~430", unit: "km/h" },
        ],
        source: NASA("https://science.nasa.gov/jupiter/"),
      },
      {
        id: "jupiter-io",
        name: "Io",
        orbit: { angle: 115, distance: 1.2 },
        category: "moon",
        summary: "The most volcanic world in the solar system.",
        facts: [
          "Io has hundreds of active volcanoes, some throwing plumes hundreds of kilometers into space.",
          "Its fire is tidal: Jupiter's gravity, tugged against by Europa and Ganymede, flexes Io's interior until it melts.",
          "Sulfur compounds paint its surface in yellows, oranges, and reds.",
        ],
        stats: [
          { label: "Diameter", value: "3,643", unit: "km" },
          { label: "Active volcanoes", value: "~400" },
        ],
        source: NASA("https://science.nasa.gov/jupiter/jupiter-moons/io/"),
      },
      {
        id: "jupiter-europa",
        name: "Europa",
        orbit: { angle: 245, distance: 1.2 },
        category: "moon",
        summary: "An icy moon hiding a salt-water ocean beneath its shell.",
        facts: [
          "Beneath its cracked ice lies an ocean that may hold about twice as much water as all of Earth's oceans.",
          "Kept liquid by tidal heating, that ocean makes Europa one of the most promising places to look for life beyond Earth.",
          "Flying past in 2022, NASA's Juno peered beneath the ice with microwaves and found the shell averages about 29 km thick where it looked.",
          "NASA's Europa Clipper launched in October 2024 and is due to arrive in 2030.",
        ],
        stats: [
          { label: "Diameter", value: "3,122", unit: "km" },
          // Juno's Microwave Radiometer, reported January 2026, over the region it observed.
          { label: "Ice shell", value: "~29", unit: "km" },
        ],
        source: NASA("https://science.nasa.gov/jupiter/jupiter-moons/europa/"),
      },
      {
        id: "jupiter-ganymede",
        name: "Ganymede",
        orbit: { angle: 285, distance: 1.25 },
        category: "moon",
        summary: "The largest moon in the solar system, bigger than the planet Mercury.",
        facts: [
          "It is the only moon known to generate its own magnetic field.",
          "A buried ocean of salt water likely lies sandwiched between layers of ice.",
          "Its surface mixes dark, ancient cratered ground with younger, brighter grooved terrain.",
        ],
        stats: [{ label: "Diameter", value: "5,268", unit: "km" }],
        source: NASA("https://science.nasa.gov/jupiter/jupiter-moons/ganymede/"),
      },
    ],
  },
  {
    id: "saturn",
    name: "Saturn",
    wikipedia: "https://en.wikipedia.org/wiki/Saturn",
    color: "#e3c88a",
    displayRadius: 2.2,
    orbitDistance: 36,
    orbitSpeed: 0.19,
    tagline: "Famous for its sweeping ring system.",
    distanceAU: 9.58,
    eccentricity: 0.0565,
    stats: [
      { label: "Diameter", value: "116,460", unit: "km" },
      { label: "Day", value: "10.7", unit: "hours" },
    ],
    pois: [
      {
        id: "saturn-hexagon",
        name: "The Hexagon",
        lat: 78,
        lon: 0,
        category: "storm",
        summary: "A six-sided jet stream circling Saturn's north pole.",
        facts: [
          "It spans about 30,000 km across, so each of its six sides is longer than Earth is wide.",
          "Its winds race at about 320 km/h around a huge rotating storm at its centre.",
          "First glimpsed by the twin Voyagers in the early 1980s, it has held its shape for decades.",
          "NASA's Cassini watched its color shift from blue toward gold as northern summer approached.",
        ],
        stats: [
          { label: "Across", value: "~30,000", unit: "km" },
          { label: "Winds", value: "~320", unit: "km/h" },
        ],
        source: NASA("https://science.nasa.gov/saturn/facts/"),
      },
      {
        id: "saturn-rings",
        name: "The Rings",
        // On the ring itself: along the major axis, which leans down to the right.
        orbit: { angle: -18, distance: 1.75 },
        category: "ring",
        summary: "A vast disk of ice, hundreds of thousands of kilometers wide and astonishingly thin.",
        facts: [
          "The main rings span about 282,000 km, yet in most places they are only about 10 meters thick.",
          "They are made of countless pieces of water ice, from specks of dust to chunks the size of houses.",
          "Cassini's measurements suggest the rings may be young, perhaps a few hundred million years old, though the question is still debated.",
        ],
        stats: [
          { label: "Span", value: "~282,000", unit: "km" },
          { label: "Typical thickness", value: "~10", unit: "m" },
        ],
        source: NASA("https://science.nasa.gov/saturn/facts/"),
      },
      {
        id: "saturn-titan",
        name: "Titan",
        orbit: { angle: 100, distance: 1.5 },
        category: "moon",
        summary: "A moon wrapped in orange haze, with rain, rivers, and seas of liquid methane.",
        facts: [
          "Titan is the only moon with a thick atmosphere, and the only world besides Earth known to have stable liquid on its surface.",
          "Its lakes and seas are filled not with water but with liquid methane and ethane.",
          "In 2005 the Huygens probe parachuted through its haze and landed, the most distant landing ever made.",
          "NASA's Dragonfly rotorcraft is planned to launch in 2028 and fly across its dunes.",
        ],
        stats: [
          { label: "Diameter", value: "5,150", unit: "km" },
          { label: "Surface", value: "~−179", unit: "°C" },
        ],
        source: NASA("https://science.nasa.gov/saturn/moons/titan/"),
      },
      {
        id: "saturn-enceladus",
        name: "Enceladus",
        orbit: { angle: 262, distance: 1.45 },
        category: "moon",
        summary: "A small, brilliant moon that sprays its hidden ocean into space.",
        facts: [
          "Jets of water vapor and ice erupt from cracks near its south pole, nicknamed the 'tiger stripes'.",
          "Cassini flew through the plumes and tasted salts, silica, and organic molecules from an ocean beneath the ice.",
          "Its fresh, icy surface reflects nearly all the sunlight that reaches it, making it one of the brightest objects in the solar system.",
        ],
        stats: [{ label: "Diameter", value: "~504", unit: "km" }],
        source: NASA("https://science.nasa.gov/saturn/moons/enceladus/"),
      },
    ],
  },
  {
    id: "uranus",
    name: "Uranus",
    wikipedia: "https://en.wikipedia.org/wiki/Uranus",
    color: "#9ad7d1",
    displayRadius: 1.6,
    orbitDistance: 43,
    orbitSpeed: 0.13,
    tagline: "An ice giant tilted almost on its side.",
    distanceAU: 19.2,
    eccentricity: 0.0457,
    stats: [
      { label: "Diameter", value: "50,724", unit: "km" },
      { label: "Day", value: "17.2", unit: "hours" },
    ],
    pois: [
      {
        id: "uranus-axial-tilt",
        name: "The Sideways Pole",
        // Marked at the pole of the rendered sphere: the tilt is about the whole planet.
        lat: 85,
        lon: 0,
        category: "atmosphere",
        summary: "Uranus spins tipped over on its side, rolling around the Sun like a ball.",
        facts: [
          "Its axis is tilted about 98 degrees, more than any other planet's.",
          "Each pole gets around 42 years of unbroken sunlight, followed by 42 years of night.",
          "The tilt may be the scar of a collision with an Earth-sized body early in the solar system's history.",
        ],
        stats: [
          { label: "Axial tilt", value: "97.8", unit: "°" },
          { label: "Year", value: "84", unit: "Earth years" },
        ],
        source: NASA("https://science.nasa.gov/uranus/facts/"),
      },
      {
        id: "uranus-rings",
        name: "The Dark Rings",
        orbit: { angle: 60, distance: 1.3 },
        category: "ring",
        summary: "Thin, dark rings, found when they made a distant star blink.",
        facts: [
          "Uranus has 13 known rings, narrow bands of dark material, very different from Saturn's bright ice.",
          "They were discovered in 1977, when astronomers watched a star flicker as the rings passed in front of it.",
          "Because the planet lies on its side, its rings are tipped nearly upright relative to its orbit.",
        ],
        stats: [{ label: "Known rings", value: "13" }],
        source: NASA("https://science.nasa.gov/uranus/facts/"),
      },
      {
        id: "uranus-miranda",
        name: "Miranda",
        orbit: { angle: 230, distance: 1.3 },
        category: "moon",
        summary: "A small moon that looks as if it were shattered and pieced back together.",
        facts: [
          "Its surface is a patchwork of grooved terrain, ridges, and canyons unlike any other moon's.",
          "Its cliff Verona Rupes may be the tallest in the solar system, dropping about 20 km.",
          "Voyager 2 photographed it in January 1986, during the only spacecraft visit to Uranus.",
        ],
        stats: [
          { label: "Diameter", value: "~470", unit: "km" },
          { label: "Tallest cliff", value: "~20", unit: "km" },
        ],
        source: NASA("https://science.nasa.gov/uranus/moons/miranda/"),
      },
    ],
  },
  {
    id: "neptune",
    name: "Neptune",
    wikipedia: "https://en.wikipedia.org/wiki/Neptune",
    color: "#3b5ba9",
    displayRadius: 1.55,
    orbitDistance: 50,
    orbitSpeed: 0.1,
    tagline: "The farthest planet, battered by the solar system's fastest winds.",
    distanceAU: 30.07,
    eccentricity: 0.0113,
    stats: [
      { label: "Diameter", value: "49,244", unit: "km" },
      { label: "Day", value: "16.1", unit: "hours" },
    ],
    pois: [
      {
        id: "neptune-great-dark-spot",
        name: "Great Dark Spot",
        // Matched to the dark oval in the Neptune texture, which is based on Voyager 2 images.
        lat: -17,
        lon: 21,
        category: "storm",
        summary: "A storm the width of Earth, seen once by Voyager 2 and then gone.",
        facts: [
          "Voyager 2 found this dark oval in 1989, roughly as wide as Earth.",
          "When the Hubble Space Telescope looked again in 1994, it had vanished; new dark spots have formed and faded since.",
          "Winds near it blew at about 2,100 km/h, the fastest measured on any planet.",
        ],
        stats: [
          { label: "Width (1989)", value: "~13,000", unit: "km" },
          { label: "Peak winds", value: "~2,100", unit: "km/h" },
        ],
        source: NASA("https://science.nasa.gov/neptune/neptune-facts/"),
      },
      {
        id: "neptune-triton",
        name: "Triton",
        orbit: { angle: 125, distance: 1.25 },
        category: "moon",
        summary: "A captured moon orbiting backward, with geysers on a frozen surface.",
        facts: [
          "Triton circles Neptune against the planet's spin, a sign that it was probably captured from the Kuiper Belt.",
          "Voyager 2 saw geysers on it blowing dark plumes about 8 km high into its thin air.",
          "At about −235 °C, its surface is among the coldest ever measured in the solar system.",
          "Neptune's tides are slowly drawing it inward; one day it may be torn apart and become a ring.",
        ],
        stats: [
          { label: "Diameter", value: "2,707", unit: "km" },
          { label: "Surface", value: "~−235", unit: "°C" },
        ],
        source: NASA("https://science.nasa.gov/neptune/moons/triton/"),
      },
      {
        id: "neptune-ring-arcs",
        name: "The Ring Arcs",
        orbit: { angle: 250, distance: 1.3 },
        category: "ring",
        summary: "Bright clumps in Neptune's outer ring that by ordinary physics should not exist.",
        facts: [
          "Neptune's outermost ring, Adams, holds bright arcs named Liberté, Égalité, Fraternité, and Courage.",
          "Left alone, such clumps should smear out evenly around the ring; the gravity of a small nearby moon may be herding them.",
          "Neptune has five main rings, each named for an astronomer who helped discover or study the planet.",
        ],
        stats: [{ label: "Main rings", value: "5" }],
        source: NASA("https://science.nasa.gov/mission/voyager/"),
      },
    ],
  },
];

/** Dwarf planets get a destination and planet view, but no Roman numeral. */
export const DWARF_PLANETS: CelestialBody[] = [
  {
    id: "pluto",
    name: "Pluto",
    wikipedia: "https://en.wikipedia.org/wiki/Pluto",
    kind: "dwarf",
    color: "#c9a88a",
    displayRadius: 0.35,
    orbitDistance: 56,
    orbitSpeed: 0.08,
    tagline: "A small, frozen world with a heart of nitrogen ice.",
    distanceAU: 39.5,
    eccentricity: 0.2488,
    stats: [
      { label: "Diameter", value: "2,377", unit: "km" },
      { label: "Day", value: "6.4", unit: "Earth days" },
    ],
    pois: [
      {
        id: "pluto-sputnik-planitia",
        name: "Sputnik Planitia",
        lat: 20,
        lon: 175,
        category: "geology",
        summary: "The bright western lobe of Pluto's heart, a vast plain of nitrogen ice.",
        facts: [
          "It stretches roughly 1,000 km across, a glacier of frozen nitrogen with no impact craters at all.",
          "Its surface is a mosaic of slowly churning cells, each tens of kilometers wide, constantly renewing the ice.",
          "It probably fills an ancient impact basin, and its weight may have helped tip Pluto into its present orientation.",
          "The whole heart-shaped region is named Tombaugh Regio, after Clyde Tombaugh, who discovered Pluto in 1930.",
        ],
        stats: [{ label: "Width", value: "~1,000", unit: "km" }],
        source: NASA("https://science.nasa.gov/dwarf-planets/pluto/"),
      },
      {
        id: "pluto-cthulhu",
        name: "Cthulhu Macula",
        lat: -5,
        lon: 105,
        category: "surface",
        summary: "A long, dark stain along Pluto's equator, the color of rust and old blood.",
        facts: [
          "It stretches about 3,000 km along the equator.",
          "Its reddish darkness likely comes from tholins, complex organic molecules made when sunlight strikes methane ice.",
          "Its name, after a creature from H. P. Lovecraft's fiction, began as a nickname among the mission team.",
          "Much of Pluto's southern hemisphere lay in seasonal darkness during the flyby, so it was never mapped in detail.",
        ],
        stats: [{ label: "Length", value: "~3,000", unit: "km" }],
        source: NASA("https://science.nasa.gov/mission/new-horizons/"),
      },
      {
        id: "pluto-wright-mons",
        name: "Wright Mons",
        lat: -21.5,
        lon: 173.7,
        category: "geology",
        summary: "A broad mountain with a deep summit pit, possibly an ice volcano.",
        facts: [
          "It rises about 4 km and spreads some 150 km across, with a deep depression at its summit.",
          "It may be a cryovolcano, which erupted slushy water ice rather than molten rock.",
          "Its sparse cratering suggests it is young, by the standards of the outer solar system.",
        ],
        stats: [
          { label: "Height", value: "~4", unit: "km" },
          { label: "Width", value: "~150", unit: "km" },
        ],
        source: NASA("https://science.nasa.gov/dwarf-planets/pluto/"),
      },
      {
        id: "pluto-charon",
        name: "Charon",
        orbit: { angle: 215, distance: 1.55 },
        category: "moon",
        summary: "Pluto's companion, so large that the two circle a point in space between them.",
        facts: [
          "Charon is about half Pluto's width, making the pair almost a double world.",
          "They are tidally locked: each always shows the other the same face.",
          "Its north pole wears a dark red cap, nicknamed Mordor Macula, thought to form from gas escaping Pluto.",
        ],
        stats: [{ label: "Diameter", value: "1,212", unit: "km" }],
        source: NASA("https://science.nasa.gov/dwarf-planets/pluto/moons/charon/"),
      },
    ],
  },
];

/** Bodies placed along the overview's diagonal: the eight planets, then dwarf planets. */
export const DESTINATIONS: CelestialBody[] = [...PLANETS, ...DWARF_PLANETS];

/** Every body with its own view, including the Sun. */
export const VIEWABLE: CelestialBody[] = [SUN, ...DESTINATIONS];

/**
 * Where a spacecraft sits in the overview, relative to a body (or the Sun).
 * `bearing` is in degrees from the direction pointing away from the Sun, turning
 * counterclockwise on screen; 0 puts it straight behind the body, as at Earth's L2.
 * `distance` is in multiples of the body's radius in the overview.
 */
export interface OverviewPlacement {
  anchor: string;
  bearing: number;
  distance: number;
}

/** Line illustrations live in src/components/spacecraftDrawings.tsx, keyed by these names. */
export type SpacecraftDrawing = "voyager" | "jwst" | "juno" | "parker" | "new-horizons" | "iss" | "messenger";

export interface Spacecraft extends POIContent {
  launchYear: number;
  drawing: SpacecraftDrawing;
  placement: OverviewPlacement;
}

export const SPACECRAFT: Spacecraft[] = [
  {
    id: "voyager-1",
    name: "Voyager 1",
    launchYear: 1977,
    drawing: "voyager",
    // Saturn was its last planetary encounter; it climbed north out of the plane of the planets.
    placement: { anchor: "saturn", bearing: 100, distance: 5 },
    category: "mission",
    summary: "The most distant human-made object, still calling home from interstellar space.",
    facts: [
      "Launched in September 1977, it swept past Jupiter and Saturn before climbing out of the plane of the planets.",
      "In 2012 it became the first spacecraft to cross into interstellar space.",
      "It is now about 170 times farther from the Sun than Earth is; its radio whispers take nearly a full day to reach us.",
      "It carries the Golden Record, a disc of sounds and images from Earth, for anyone who might one day find it.",
    ],
    stats: [
      { label: "Launched", value: "1977" },
      { label: "Distance", value: "~170", unit: "AU" },
    ],
    source: NASA("https://science.nasa.gov/mission/voyager/voyager-1/"),
  },
  {
    id: "voyager-2",
    name: "Voyager 2",
    launchYear: 1977,
    drawing: "voyager",
    // Neptune was its last planetary encounter; it is heading south.
    placement: { anchor: "neptune", bearing: -70, distance: 3 },
    category: "mission",
    summary: "The only spacecraft to have visited Uranus and Neptune.",
    facts: [
      "It launched in August 1977, sixteen days before its twin, and toured all four giant planets.",
      "It crossed into interstellar space in 2018.",
      "It is heading south of the plane of the planets, about 140 times farther from the Sun than Earth.",
      "To stretch its fading power, engineers have been switching off its instruments one by one.",
    ],
    stats: [
      { label: "Launched", value: "1977" },
      { label: "Distance", value: "~140", unit: "AU" },
    ],
    source: NASA("https://science.nasa.gov/mission/voyager/voyager-2/"),
  },
  {
    id: "jwst",
    name: "James Webb Space Telescope",
    launchYear: 2021,
    drawing: "jwst",
    // Straight behind Earth, as seen from the Sun: the second Lagrange point.
    placement: { anchor: "earth", bearing: 0, distance: 2.6 },
    category: "mission",
    summary: "The largest space telescope ever launched, gazing back toward the first galaxies.",
    facts: [
      "Launched on December 25, 2021, it orbits the Sun near the second Lagrange point, about 1.5 million km beyond Earth.",
      "Its 6.5-meter golden mirror is built from 18 hexagonal segments that unfolded in space.",
      "A sunshield the size of a tennis court keeps its instruments below −223 °C, cold enough to sense faint infrared light.",
      "It can see galaxies that formed within a few hundred million years of the Big Bang.",
    ],
    stats: [
      { label: "Mirror", value: "6.5", unit: "m" },
      { label: "From Earth", value: "~1.5 million", unit: "km" },
    ],
    source: NASA("https://science.nasa.gov/mission/webb/"),
  },
  {
    id: "juno",
    name: "Juno",
    launchYear: 2011,
    drawing: "juno",
    placement: { anchor: "jupiter", bearing: 90, distance: 1.7 },
    category: "mission",
    summary: "A solar-powered spacecraft looping over Jupiter's poles.",
    facts: [
      "Launched in 2011, it arrived at Jupiter on July 4, 2016.",
      "Three solar arrays, each about 9 meters long, power it farther from the Sun than any solar-powered craft before it.",
      "Its looping polar orbit revealed clusters of giant cyclones swirling at Jupiter's poles.",
      "Its extended mission carried it past the moons Ganymede, Europa, and Io.",
    ],
    stats: [
      { label: "Arrived", value: "July 4, 2016" },
      { label: "Solar arrays", value: "~9", unit: "m" },
    ],
    source: NASA("https://science.nasa.gov/mission/juno/"),
  },
  {
    id: "parker-solar-probe",
    name: "Parker Solar Probe",
    launchYear: 2018,
    drawing: "parker",
    placement: { anchor: "sun", bearing: -8, distance: 1.2 },
    category: "mission",
    summary: "The spacecraft that touches the Sun, closer than anything humans have ever sent.",
    facts: [
      "Launched in 2018, it holds the record as the closest human-made object to a star.",
      "On its nearest passes it skims about 6.1 million kilometers above the solar surface.",
      "It is also the fastest object ever built, reaching around 690,000 km/h.",
      "A thick carbon-composite shield keeps its instruments near room temperature while its sunward face glows at over 1,000 °C.",
    ],
    stats: [
      { label: "Closest pass", value: "~6.1 million", unit: "km" },
      { label: "Top speed", value: "~690,000", unit: "km/h" },
    ],
    source: NASA("https://science.nasa.gov/mission/parker-solar-probe/"),
  },
  {
    id: "new-horizons",
    name: "New Horizons",
    launchYear: 2006,
    drawing: "new-horizons",
    placement: { anchor: "pluto", bearing: 20, distance: 4 },
    category: "mission",
    summary: "The first spacecraft to visit Pluto, now crossing the Kuiper Belt.",
    facts: [
      "When it launched in January 2006 it was the fastest spacecraft ever sent from Earth.",
      "It flew past Pluto on July 14, 2015, revealing glaciers of nitrogen and mountains of water ice.",
      "On New Year's Day 2019 it flew past Arrokoth, the most distant object ever explored up close.",
      "It is about the size of a grand piano, powered by a single plutonium generator.",
    ],
    stats: [
      { label: "Launched", value: "2006" },
      { label: "Pluto flyby", value: "July 14, 2015" },
    ],
    source: NASA("https://science.nasa.gov/mission/new-horizons/"),
  },
];

/**
 * A belt of small bodies, drawn as a static stippled band around the Sun in the overview.
 * `between` names the bodies whose orbits bound it; `fill` places its inner and outer edge
 * as fractions of the gap between them (values past 1 extend beyond the second body).
 * `arc` is its angular extent in degrees from the overview's diagonal, positive toward the
 * top of the screen; `labelAt` is where along that arc its clickable label sits.
 */
export interface Belt extends POIContent {
  between: [string, string];
  fill: [number, number];
  arc: [number, number];
  labelAt: number;
  /** Dots per 10,000 square pixels. */
  density: number;
}

export const BELTS: Belt[] = [
  {
    id: "asteroid-belt",
    name: "Asteroid Belt",
    between: ["mars", "jupiter"],
    fill: [0.3, 0.72],
    arc: [-24, 13],
    labelAt: -14,
    density: 85,
    category: "geology",
    summary: "A loose ring of rocky leftovers between Mars and Jupiter.",
    facts: [
      "Millions of asteroids orbit here, yet all together they hold only about 3 percent of the Moon's mass.",
      "For all its crowded reputation it is mostly empty space, with asteroids typically about a million kilometers apart.",
      "Its largest member, Ceres, is a dwarf planet about 940 km across.",
      "Jupiter's gravity kept these fragments from ever gathering into a planet.",
    ],
    stats: [
      { label: "Largest body", value: "Ceres, ~940", unit: "km" },
      { label: "Total mass", value: "~3", unit: "% of the Moon" },
    ],
    source: NASA("https://science.nasa.gov/solar-system/asteroids/"),
  },
  {
    id: "kuiper-belt",
    name: "Kuiper Belt",
    between: ["neptune", "pluto"],
    fill: [0.35, 2.6],
    arc: [-22, 12],
    labelAt: 2,
    density: 60,
    category: "geology",
    summary: "A vast, icy realm beyond Neptune, home to Pluto and countless frozen worlds.",
    facts: [
      "It stretches from about 30 to 50 times Earth's distance from the Sun.",
      "It holds icy bodies left over from the birth of the solar system, including the dwarf planets Pluto, Haumea, and Makemake.",
      "Many short-period comets are thought to begin their journeys here.",
      "It is named for astronomer Gerard Kuiper, who wrote about such a region in 1951.",
    ],
    stats: [{ label: "Extent", value: "30–50", unit: "AU" }],
    source: NASA("https://science.nasa.gov/solar-system/kuiper-belt/"),
  },
];

export const SOLAR_SYSTEM: CelestialBody[] = [SUN, ...PLANETS, ...DWARF_PLANETS];
