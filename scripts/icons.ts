/**
 * Draws the site's icons into public/: favicon.svg, favicon.ico (16/32/48), the Apple touch
 * icon, and the web manifest's icons (192, 512, and a maskable 512). All come from one
 * original mark in the Astrolabe line work: a candle-gold ring with a four-point star at
 * its center and a single world on the ring, on the abyss. Run with `npm run icons` after
 * changing the mark, then commit the files.
 */
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { PALETTE } from "../src/lib/palette.ts";

const out = new URL("../public/", import.meta.url).pathname;

/** The four-point star of the label leaders, a little fuller so it holds at 16px. */
const STAR = "M6 0C6.6 3.6 8.4 5.4 12 6C8.4 6.6 6.6 8.4 6 12C5.4 8.4 3.6 6.6 0 6C3.6 5.4 5.4 3.6 6 0Z";

/** The mark in a 64 box: ring, star, and a world on the ring at the upper right. */
function mark() {
  const a = (-40 * Math.PI) / 180;
  const wx = (32 + Math.cos(a) * 21).toFixed(2);
  const wy = (32 + Math.sin(a) * 21).toFixed(2);
  return [
    `<circle cx="32" cy="32" r="21" fill="none" stroke="${PALETTE.gold}" stroke-width="3.2"/>`,
    `<path d="${STAR}" fill="${PALETTE.ivory}" transform="translate(19.4 19.4) scale(2.1)"/>`,
    // The gap around the world is the abyss, so it reads as sitting on the ring.
    `<circle cx="${wx}" cy="${wy}" r="5.6" fill="${PALETTE.gold}" stroke="${PALETTE.abyss}" stroke-width="1.6"/>`,
  ].join("");
}

/** Round icon on the abyss, transparent corners: for browser tabs, light or dark. */
const roundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${PALETTE.abyss}"/>${mark()}</svg>\n`;

/** Full-bleed square with the violet haze, the mark scaled by `scale` (maskable icons keep it in the safe zone). */
const squareSvg = (scale: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="h" cx="0.5" cy="0.45" r="0.7"><stop offset="0" stop-color="#2a1d3d"/><stop offset="1" stop-color="${PALETTE.abyss}"/></radialGradient></defs><rect width="64" height="64" fill="url(#h)"/><g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${mark()}</g></svg>`;

/** An .ico holding PNG images (supported everywhere .ico still matters). */
function ico(pngs: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6 + pngs.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4); // color planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(svg: string, size: number) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  return page.screenshot({ omitBackground: true, type: "png" });
}

writeFileSync(`${out}favicon.svg`, roundSvg);
const icoImages = [];
for (const size of [16, 32, 48]) icoImages.push({ size, data: await png(roundSvg, size) });
writeFileSync(`${out}favicon.ico`, ico(icoImages));
writeFileSync(`${out}apple-touch-icon.png`, await png(squareSvg(1.1), 180));
writeFileSync(`${out}icon-192.png`, await png(squareSvg(1.1), 192));
writeFileSync(`${out}icon-512.png`, await png(squareSvg(1.1), 512));
writeFileSync(`${out}icon-maskable-512.png`, await png(squareSvg(0.8), 512));
await browser.close();
console.log("favicon.svg, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png");
