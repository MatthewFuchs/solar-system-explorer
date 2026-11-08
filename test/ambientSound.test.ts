import { describe, expect, it } from "vitest";
import { SUN, VIEWABLE } from "../src/data/solarSystem";
import { SONG_NOTES, songPitch } from "../src/lib/ambientSound";

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
