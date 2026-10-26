import { DESTINATIONS, type CelestialBody } from "../src/data/solarSystem.ts";

/**
 * The 404 page's artwork: an engraved astrolabe. A limb with a degree scale, the worlds'
 * names engraved around a ring, each world a small disc lit from the Sun at the center,
 * and the rule (alidade) turned to the one place on the chart where nothing is: the
 * uncharted orbit this address points to. Static SVG, drawn at build time
 * (scripts/prerender.ts); gold hairlines and faint wide strokes for glows, never blur.
 */

const C = 500; // center of the 1000x1000 drawing
const LIMB = 476;
const SCALE_IN = 452;
const NAMES_R = 404;
const ORBIT_IN = 118;
const ORBIT_OUT = 352;
const UNCHARTED_R = 378;
/** Where the rule points (degrees, screen-clockwise from east): up and to the left. */
const RULE_ANGLE = 218;
/** Where each world sits on its orbit: spread by the golden angle, clear of the rule. */
const GOLDEN = 137.508;

const f = (n: number) => n.toFixed(1);
const rad = (deg: number) => (deg * Math.PI) / 180;
const at = (r: number, deg: number): [number, number] => [C + r * Math.cos(rad(deg)), C + r * Math.sin(rad(deg))];
const STAR = "M0 -7 C0.5 -2 2 -0.5 7 0 C2 0.5 0.5 2 0 7 C-0.5 2 -2 0.5 -7 0 C-2 -0.5 -0.5 -2 0 -7 Z";

function orbitRadius(i: number, count: number) {
  return ORBIT_IN + ((ORBIT_OUT - ORBIT_IN) * i) / (count - 1);
}

function worldAngle(i: number) {
  let angle = (40 + i * GOLDEN) % 360;
  // Keep worlds off the rule, so the empty place reads as empty.
  const gap = ((angle - RULE_ANGLE + 540) % 360) - 180;
  if (Math.abs(gap) < 16) angle += gap < 0 ? -16 - gap : 16 - gap;
  return angle;
}

/** Degree scale: a tick every 2 degrees, longer every 10, numerals every 30. */
function limb() {
  const ticks: string[] = [];
  for (let d = 0; d < 360; d += 2) {
    const long = d % 10 === 0;
    const [x0, y0] = at(SCALE_IN, d);
    const [x1, y1] = at(SCALE_IN + (long ? 14 : 7), d);
    ticks.push(`M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`);
  }
  const numerals: string[] = [];
  for (let d = 0; d < 360; d += 30) {
    const [x, y] = at(SCALE_IN - 16, d);
    numerals.push(`<text x="${f(x)}" y="${f(y)}" transform="rotate(${d + 90} ${f(x)} ${f(y)})">${d}</text>`);
  }
  return `<circle class="limb__glow" cx="${C}" cy="${C}" r="${LIMB}" />
<circle class="limb" cx="${C}" cy="${C}" r="${LIMB}" />
<circle class="limb limb--fine" cx="${C}" cy="${C}" r="${LIMB - 8}" />
<circle class="limb limb--fine" cx="${C}" cy="${C}" r="${SCALE_IN}" />
<path class="ticks" d="${ticks.join("")}" />
<g class="numerals">${numerals.join("")}</g>
<circle class="limb limb--fine" cx="${C}" cy="${C}" r="${NAMES_R + 22}" />
<circle class="limb limb--fine" cx="${C}" cy="${C}" r="${NAMES_R - 18}" />`;
}

/** Each world's name engraved on the ring at its own angle, with a small star between. */
function nameRing(worlds: { body: CelestialBody; angle: number }[]) {
  // A circle drawn from the top, clockwise, for the names to follow.
  const ring = `M${C} ${C - NAMES_R} a${NAMES_R} ${NAMES_R} 0 1 1 0 ${2 * NAMES_R} a${NAMES_R} ${NAMES_R} 0 1 1 0 ${-2 * NAMES_R}`;
  const circumference = 2 * Math.PI * NAMES_R;
  const names = worlds.map(({ body, angle }) => {
    const offset = (((angle + 90) % 360) / 360) * circumference;
    return `<text><textPath href="#name-ring" startOffset="${f(offset)}" text-anchor="middle">${body.name}</textPath></text>`;
  });
  const [ux, uy] = at(NAMES_R, RULE_ANGLE);
  return `<path id="name-ring" d="${ring}" fill="none" />
<g class="names">${names.join("")}</g>
<path class="ring-star" transform="translate(${f(ux)} ${f(uy)})" d="${STAR}" />`;
}

/** A world: a disc in its own color, lit from the Sun at the center, with a dark limb. */
function world(body: CelestialBody, i: number, count: number, angle: number) {
  const r = orbitRadius(i, count);
  const [x, y] = at(r, angle);
  const size = Math.max(6, 5 + Math.pow(body.displayRadius, 0.6) * 6);
  // The lit side faces the center.
  const fx = 0.5 - 0.32 * Math.cos(rad(angle));
  const fy = 0.5 - 0.32 * Math.sin(rad(angle));
  const id = `lit-${body.id}`;
  const dashed = body.kind === "dwarf" ? ' stroke-dasharray="3 6"' : "";
  const ring =
    body.id === "saturn"
      ? `<ellipse class="world__ring" cx="${f(x)}" cy="${f(y)}" rx="${f(size * 2.1)}" ry="${f(size * 0.7)}" transform="rotate(-24 ${f(x)} ${f(y)})" />`
      : "";
  return {
    orbit: `<circle class="orbit"${dashed} cx="${C}" cy="${C}" r="${f(r)}" />`,
    defs: `<radialGradient id="${id}" fx="${f(fx)}" fy="${f(fy)}" r="0.62"><stop offset="0" stop-color="${body.color}" /><stop offset="0.55" stop-color="${body.color}" stop-opacity="0.85" /><stop offset="1" stop-color="#06040b" /></radialGradient>`,
    body: `${ring}<circle class="world__halo" cx="${f(x)}" cy="${f(y)}" r="${f(size + 6)}" /><circle cx="${f(x)}" cy="${f(y)}" r="${f(size)}" fill="url(#${id})" />`,
  };
}

/** The rule: a long tapered arm through the center, turned to the uncharted place. */
function rule() {
  const a = rad(RULE_ANGLE);
  const [tx, ty] = at(LIMB - 4, RULE_ANGLE);
  const [bx, by] = at(LIMB - 4, RULE_ANGLE + 180);
  const w = 7;
  const nx = -Math.sin(a) * w;
  const ny = Math.cos(a) * w;
  const arm = `M${f(tx)} ${f(ty)} L${f(C + nx)} ${f(C + ny)} L${f(bx)} ${f(by)} L${f(C - nx)} ${f(C - ny)} Z`;
  const [ux, uy] = at(UNCHARTED_R, RULE_ANGLE);
  // The label sits beside the empty ring, level, toward the center of the drawing.
  const [lx, ly] = [ux + 34, uy + 6];
  return `<circle class="orbit orbit--uncharted" cx="${C}" cy="${C}" r="${UNCHARTED_R}" />
<path class="rule__glow" d="${arm}" />
<path class="rule" d="${arm}" />
<circle class="void" cx="${f(ux)}" cy="${f(uy)}" r="17" />
<circle class="void__inner" cx="${f(ux)}" cy="${f(uy)}" r="2" />
<text class="void__label" x="${f(lx)}" y="${f(ly)}">Uncharted</text>
<text class="void__meta" x="${f(lx)}" y="${f(ly + 22)}">404 · no world here</text>`;
}

/** The Sun at the center: its own map in a disc, with a warm glow made of gradients. */
function sun() {
  return `<circle cx="${C}" cy="${C}" r="150" fill="url(#sun-glow)" />
<image href="/textures/sun.webp" x="${C - 160}" y="${C - 46}" width="320" height="92" clip-path="url(#sun-disc)" preserveAspectRatio="xMidYMid slice" />
<circle cx="${C}" cy="${C}" r="46" fill="url(#sun-core)" />
<circle class="sun__rim" cx="${C}" cy="${C}" r="46" />`;
}

export function notFoundChart(): string {
  const worlds = DESTINATIONS.map((body, i) => ({ body, angle: worldAngle(i) }));
  const drawn = worlds.map(({ body, angle }, i) => world(body, i, worlds.length, angle));
  return `<svg class="astrolabe" viewBox="0 0 1000 1000" aria-hidden="true">
<defs>
<clipPath id="sun-disc"><circle cx="${C}" cy="${C}" r="46" /></clipPath>
<radialGradient id="sun-glow"><stop offset="0.25" stop-color="#f0a25a" stop-opacity="0.5" /><stop offset="1" stop-color="#f0a25a" stop-opacity="0" /></radialGradient>
<radialGradient id="sun-core"><stop offset="0" stop-color="#fff1d6" stop-opacity="0.7" /><stop offset="0.6" stop-color="#ffc678" stop-opacity="0.15" /><stop offset="1" stop-color="#7a2a0a" stop-opacity="0.45" /></radialGradient>
<radialGradient id="plate"><stop offset="0" stop-color="#1a1222" stop-opacity="0.7" /><stop offset="1" stop-color="#06040b" stop-opacity="0" /></radialGradient>
${drawn.map((d) => d.defs).join("\n")}
</defs>
<circle cx="${C}" cy="${C}" r="${LIMB}" fill="url(#plate)" />
${limb()}
${drawn.map((d) => d.orbit).join("\n")}
${rule()}
${nameRing(worlds)}
${sun()}
${drawn.map((d) => d.body).join("\n")}
</svg>`;
}

/** Faint fixed stars across the page, seeded so they stay put from build to build. */
export function notFoundStars(): string {
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars: string[] = [];
  for (let i = 0; i < 90; i++) {
    const r = [0.6, 0.8, 0.8, 1, 1.3][Math.floor(random() * 5)];
    const o = [0.2, 0.3, 0.45, 0.65][Math.floor(random() * 4)];
    stars.push(`<circle cx="${f(random() * 1600)}" cy="${f(random() * 1000)}" r="${r}" opacity="${o}" />`);
  }
  return `<svg class="stars" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${stars.join("")}</svg>`;
}
