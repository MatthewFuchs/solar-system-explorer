// The Milky Way's stipple, generated once: a bar and bulge at the core, four spiral arms, the
// short Orion Spur the Sun sits on, and a faint disc. Pure and three-free, so it can be tested.
//
// The arms are a sketch, not a measurement: we see the galaxy only from inside it. They are
// logarithmic spirals, trailing the galaxy's clockwise turn (seen from the north), fitted so
// the landmarks fall on the arms they belong to: the Crab on the Perseus Arm, the Eagle and
// Carina nebulae on the Sagittarius–Carina Arm, the Sun and the Orion Nebula on the Orion Spur.
// The bar is about 16,000 light-years long each way, its near end turned 27 degrees from the
// Sun's line of sight toward positive longitude. Distances are in light-years.
import { GALAXY_RADIUS_LY } from "../data/milkyWay";
import type { GalaxyPlacement } from "./layout/solarPlate";

const DEG = Math.PI / 180;

/**
 * A spiral arm in the galaxy's own frame: screen degrees (y down) with the Sun straight below
 * the centre, at 90. Its angle at radius r is th20 - cot(pitch) ln(r / 20,000): it winds
 * counterclockwise on screen as it runs outward, trailing the galaxy's clockwise turn.
 */
export interface Arm {
  name: string;
  /** Angle at 20,000 light-years from the centre. */
  th20: number;
  /** Pitch angle in degrees: how steeply it leaves a circle. */
  pitch: number;
  /** Where it starts and ends, from the centre. */
  from: number;
  to: number;
  /** Spread of its stars either side, and how strongly it is drawn (the two major arms are brightest). */
  width: number;
  weight: number;
}

/** An arm's angle (degrees, the galaxy's own frame) at radius r. */
export function armAngle(arm: Arm, r: number): number {
  return arm.th20 - Math.log(r / 20000) / Math.tan(arm.pitch * DEG) / DEG;
}

/** The angle at 20,000 ly of an arm with this pitch through a point at (r, angle). */
function through(r: number, angle: number, pitch: number): number {
  return angle + Math.log(r / 20000) / Math.tan(pitch * DEG) / DEG;
}

// The Crab Nebula, in the galaxy's frame: 33,450 ly from the centre, at 89.1 degrees.
const PERSEUS_TH20 = through(33450, 89.1, 12);
// Between the Eagle (20,870 ly, 95.2 deg) and Carina (25,740 ly, 73.7 deg) nebulae.
const SAGITTARIUS_TH20 = 105.5;

export const ARMS: Arm[] = [
  { name: "Perseus Arm", th20: PERSEUS_TH20, pitch: 12, from: 15000, to: 48000, width: 1500, weight: 1 },
  { name: "Scutum–Centaurus Arm", th20: PERSEUS_TH20 + 180, pitch: 12, from: 15000, to: 48000, width: 1500, weight: 1 },
  { name: "Sagittarius–Carina Arm", th20: SAGITTARIUS_TH20, pitch: 22, from: 12000, to: 44000, width: 1100, weight: 0.6 },
  { name: "Norma Arm", th20: SAGITTARIUS_TH20 + 180, pitch: 22, from: 12000, to: 44000, width: 1100, weight: 0.6 },
  // A short, steeper spur between the Sun (27,000 ly, 90 deg) and the Orion Nebula (28,120 ly,
  // 88.7 deg), which lie almost straight outward from each other: the Sun near its inner edge.
  { name: "Orion Spur", th20: through(27560, 89.35, 25), pitch: 25, from: 23000, to: 32500, width: 800, weight: 0.45 },
];

/** The bar's half-length and the angle (galaxy frame) of its near end. */
export const BAR = { half: 16000, angle: 90 + 27, width: 2200 };

/** Seeded so the stipple is identical on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Stipple {
  /** x, y, 0 per dot, in CSS pixels. */
  positions: number[];
  sizes: number[];
  alphas: number[];
  /** r, g, b per dot (linear, 0-1): blue-white young stars and rose knots in the arms, a warm core. */
  colors: number[];
}

type Rgb = [number, number, number];
/** Young, hot stars light the arms blue-white; older ones are ivory and gold. */
const YOUNG: Rgb = [0.72, 0.82, 1.0];
const IVORY: Rgb = [0.95, 0.91, 0.84];
const GOLD: Rgb = [0.92, 0.74, 0.46];
/** Glowing hydrogen around newborn stars: the rose knots strung along the arms. */
const ROSE: Rgb = [1.0, 0.48, 0.62];
/** The old stars of the bar and bulge: warm, from gold to deep amber. */
const CORE: Rgb = [1.0, 0.82, 0.52];
const AMBER: Rgb = [1.0, 0.6, 0.32];

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Dots per 10,000 square pixels of the disc, so the galaxy looks the same on any screen. */
const DENSITY = 380;

/**
 * The galaxy's dots on screen, for a galaxy placed at `g`. Generated in light-years in the
 * galaxy's own frame, then turned so the Sun lies at `g.sunAngle`.
 */
export function galaxyStipple(g: GalaxyPlacement): Stipple {
  const rand = mulberry32(1054);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const pxPerLy = g.r / GALAXY_RADIUS_LY;
  const turn = g.sunAngle - 90 * DEG;
  const out: Stipple = { positions: [], sizes: [], alphas: [], colors: [] };
  const add = (r: number, a: number, alpha: number, color: Rgb, big = 0) => {
    out.positions.push(g.x + r * Math.cos(a + turn) * pxPerLy, g.y + r * Math.sin(a + turn) * pxPerLy, 0);
    out.sizes.push(0.8 + Math.pow(rand(), 3) * (1.3 + big));
    out.alphas.push(alpha);
    out.colors.push(...color);
  };
  const total = Math.round(((Math.PI * g.r * g.r) / 10000) * DENSITY);

  // The arms: densest along their line, thinning at their ends and outward, in clumps.
  const armShare = 0.5 * total;
  const weights = ARMS.reduce((s, a) => s + a.weight * (a.to - a.from), 0);
  for (const arm of ARMS) {
    const n = Math.round((armShare * arm.weight * (arm.to - arm.from)) / weights);
    for (let i = 0; i < n; i++) {
      const k = rand();
      const r = arm.from + k * (arm.to - arm.from);
      // Star-forming knots: a slow ripple along the arm sets how many dots survive.
      if (rand() > 0.55 + 0.45 * Math.sin(r / 1700 + arm.th20)) continue;
      const rr = r + gauss() * arm.width * 1.6;
      const ends = Math.min(1, k / 0.12, (1 - k) / 0.2);
      const fade = Math.exp(-(r - 15000) / 30000);
      const pick = rand();
      const color = pick < 0.55 ? mix(IVORY, YOUNG, rand()) : pick < 0.85 ? mix(GOLD, IVORY, rand()) : YOUNG;
      add(rr, armAngle(arm, r) * DEG, (0.2 + rand() * 0.5) * ends * fade * (0.6 + 0.4 * arm.weight), color, 0.4 * arm.weight);
    }
    // Star-forming knots: small rose clouds of newborn stars, strung along the arm.
    const knots = Math.round((arm.to - arm.from) / 1400 * arm.weight);
    for (let j = 0; j < knots; j++) {
      const r = arm.from + (0.08 + 0.84 * rand()) * (arm.to - arm.from);
      const a = armAngle(arm, r) * DEG;
      const kr = r + gauss() * arm.width * 0.6;
      const dots = 5 + Math.floor(rand() * 9);
      for (let d = 0; d < dots; d++) {
        const dr = gauss() * 380;
        const da = (gauss() * 380) / kr;
        add(kr + dr, a + da, 0.45 + rand() * 0.5, d % 4 === 0 ? YOUNG : ROSE, 0.6);
      }
    }
  }

  // The bar and the bulge: crowded, brighter, and ivory.
  const barN = Math.round(0.14 * total);
  const ba = BAR.angle * DEG;
  for (let i = 0; i < barN; i++) {
    const along = (rand() * 2 - 1) * BAR.half * Math.sqrt(rand());
    const across = gauss() * BAR.width * (1 - (0.5 * Math.abs(along)) / BAR.half);
    const x = along * Math.cos(ba) - across * Math.sin(ba);
    const y = along * Math.sin(ba) + across * Math.cos(ba);
    add(Math.hypot(x, y), Math.atan2(y, x), 0.3 + rand() * 0.45, mix(CORE, AMBER, rand()));
  }
  const bulgeN = Math.round(0.07 * total);
  for (let i = 0; i < bulgeN; i++) {
    add(Math.abs(gauss()) * 3200, rand() * Math.PI * 2, 0.22 + rand() * 0.4, mix(CORE, IVORY, rand() * 0.6), 0.5);
  }

  // The disc between the arms: faint, thinning outward to its edge.
  const discN = Math.round(0.28 * total);
  for (let i = 0; i < discN; i++) {
    const r = Math.min(GALAXY_RADIUS_LY * 0.98, -Math.log(1 - rand() * 0.97) * 13000);
    add(r, rand() * Math.PI * 2, 0.1 + rand() * 0.24, mix(GOLD, IVORY, rand()));
  }
  return out;
}
