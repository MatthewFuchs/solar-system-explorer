import { describe, expect, it } from "vitest";
import { SUN, VIEWABLE } from "../src/data/solarSystem";
import { DISCOVERY_NOTES, SONG_NOTES, songPitch, starChord } from "../src/lib/ambientSound";
import { NEIGHBOURS } from "../src/data/neighbourhood";

const worlds = VIEWABLE.filter((b) => b.kind !== "star");

describe("planet songs", () => {
  it("give the Sun a chord, not a glide", () => {
    expect(songPitch(SUN)).toBeNull();
  });

  it("start every world on a note of the ambient pentatonic", () => {
    for (const body of worlds) {
      const pitch = songPitch(body);
      expect(pitch, body.id).not.toBeNull();
      expect(SONG_NOTES, body.id).toContain(pitch!.low);
    }
  });

  it("start Earth on E4", () => {
    expect(songPitch(VIEWABLE.find((b) => b.id === "earth")!)!.low).toBeCloseTo(329.63, 0);
  });

  it("start closer worlds higher", () => {
    const byDistance = [...worlds].sort((a, b) => a.distanceAU! - b.distanceAU!);
    for (let i = 1; i < byDistance.length; i++) {
      expect(songPitch(byDistance[i])!.low, byDistance[i].id).toBeLessThanOrEqual(songPitch(byDistance[i - 1])!.low);
    }
  });

  it("glide by Kepler's ((1+e)/(1-e))^2 from the real eccentricity", () => {
    for (const body of worlds) {
      const e = body.eccentricity!;
      expect(songPitch(body)!.ratio, body.id).toBeCloseTo(((1 + e) / (1 - e)) ** 2, 10);
      expect(songPitch(body)!.ratio, body.id).toBeGreaterThan(1);
    }
    // Mercury's eccentric orbit sings a wide glide; Venus's near-circle barely moves.
    const ratio = (id: string) => songPitch(VIEWABLE.find((b) => b.id === id)!)!.ratio;
    expect(ratio("mercury")).toBeGreaterThan(2);
    expect(ratio("venus")).toBeLessThan(1.03);
  });
});

describe("star chords", () => {
  it("pitch hotter stars higher: one pentatonic step per spectral class, the Sun's class on D3", () => {
    expect(starChord("G2V")![0]).toBeCloseTo(146.83, 1);
    expect(starChord("A1V")![0]).toBeGreaterThan(starChord("F5IV-V")![0]);
    expect(starChord("F5IV-V")![0]).toBeGreaterThan(starChord("G8V")![0]);
    expect(starChord("K2V")![0]).toBeGreaterThan(starChord("M4V")![0]);
    expect(starChord("X")).toBeNull();
  });

  it("tune every neighbour's chord to the ambient scale", () => {
    for (const star of NEIGHBOURS) {
      const chord = starChord(star.spectralType!)!;
      expect(chord, star.id).toHaveLength(3);
      for (const f of chord) expect(SONG_NOTES.some((n) => Math.abs(n - f) < 0.01) || SONG_NOTES.some((n) => Math.abs(n * 2 - f) < 0.01), `${star.id} ${f}`).toBe(true);
    }
  });

  it("rise for a discovery through the same scale", () => {
    for (const f of DISCOVERY_NOTES) expect(SONG_NOTES.some((n) => Math.abs(n - f) < 0.05), String(f)).toBe(true);
    expect([...DISCOVERY_NOTES]).toEqual([...DISCOVERY_NOTES].sort((a, b) => a - b));
  });
});
