import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pub = (f: string) => new URL(`../public/${f}`, import.meta.url);

/** Width and height from a PNG's IHDR chunk. */
function pngSize(data: Buffer) {
  expect(data.subarray(1, 4).toString()).toBe("PNG");
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

describe("site icons", () => {
  const manifest = JSON.parse(readFileSync(pub("site.webmanifest"), "utf8"));

  it("name the site and match the abyss in the manifest", () => {
    expect(manifest.name).toBe("Solar System Explorer");
    expect(manifest.background_color).toBe("#06040B");
    expect(manifest.theme_color).toBe("#06040B");
    // Relative, so the app installs from under a base path (GitHub Pages).
    expect(manifest.start_url).not.toMatch(/^\//);
  });

  it("list icons that exist at their stated sizes, including a maskable one", () => {
    for (const icon of manifest.icons) {
      expect(icon.src, icon.src).not.toMatch(/^\//);
      const [w, h] = pngSize(readFileSync(pub(icon.src)));
      expect(`${w}x${h}`, icon.src).toBe(icon.sizes);
    }
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  });

  it("give Apple a 180px touch icon", () => {
    expect(pngSize(readFileSync(pub("apple-touch-icon.png")))).toEqual([180, 180]);
  });

  it("pack 16, 32, and 48px images in favicon.ico", () => {
    const ico = readFileSync(pub("favicon.ico"));
    expect(ico.readUInt16LE(2)).toBe(1); // icon, not cursor
    const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico.readUInt8(6 + i * 16));
    expect(sizes).toEqual([16, 32, 48]);
  });

  it("keep the SVG favicon free of the default Vite logo and of filters", () => {
    const svg = readFileSync(pub("favicon.svg"), "utf8");
    expect(svg).toContain("#D6B06A");
    expect(svg).not.toMatch(/filter|863bff/i);
  });
});
