// Nights the real sky puts on a show. On those days one short line under the plate's
// introduction notes it (set in the space below, so the title never moves), and being here
// then is a logbook entry (Sky on the Day). Windows are a little wider than the peak itself,
// which shifts by a day or so from year to year.
// Source: NASA, meteor showers (peaks and parent bodies).
import type { POISource } from "./solarSystem.ts";

export interface SkyDay {
  id: string;
  /** First and last day (month 1-12, day of month), inclusive, every year. */
  from: [month: number, day: number];
  to: [month: number, day: number];
  /** One short line under the plate's introduction, all visit. */
  line: string;
  /** Said once, large, when the night is first noted in the logbook. */
  detail: string;
  source: POISource;
}

const NASA_METEORS: POISource = {
  label: "NASA",
  url: "https://science.nasa.gov/solar-system/meteors-meteorites/",
};

export const SKY_DAYS: SkyDay[] = [
  {
    id: "perseids",
    from: [8, 11],
    to: [8, 13],
    line: "Tonight the Perseids are near their peak.",
    detail: "Grains of Comet Swift-Tuttle are burning up high in our sky tonight.",
    source: NASA_METEORS,
  },
  {
    id: "leonids",
    from: [11, 16],
    to: [11, 18],
    line: "Tonight the Leonids are near their peak.",
    detail: "Grains shed by Comet Tempel-Tuttle are falling through our sky tonight.",
    source: NASA_METEORS,
  },
  {
    id: "geminids",
    from: [12, 12],
    to: [12, 14],
    line: "Tonight the Geminids are near their peak.",
    detail: "Tonight's falling stars come not from a comet but from the asteroid 3200 Phaethon.",
    source: NASA_METEORS,
  },
];

/** The sky's show on this date, if there is one (local date). */
export function skyDayFor(date: Date): SkyDay | null {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  return SKY_DAYS.find((d) => md >= d.from[0] * 100 + d.from[1] && md <= d.to[0] * 100 + d.to[1]) ?? null;
}
