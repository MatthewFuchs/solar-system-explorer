import { useRef } from "react";
import { line } from "./panelLine";
import { SidePanel, type PanelState } from "./SidePanel";

interface CreditsPanelProps {
  state: PanelState;
  onClose: () => void;
  onClosed: () => void;
}

interface CreditEntry {
  title: string;
  /** Who made it, and under what terms. */
  detail: string;
  link?: { label: string; url: string };
}

const SECTIONS: { heading: string; entries: CreditEntry[] }[] = [
  {
    heading: "Typefaces",
    entries: [
      {
        title: "Marcellus",
        detail: "Designed by Brian J. Bonislawsky (Astigmatic). SIL Open Font License, served by Google Fonts.",
        link: { label: "Google Fonts", url: "https://fonts.google.com/specimen/Marcellus" },
      },
      {
        title: "Cormorant Garamond",
        detail: "Designed by Christian Thalmann (Catharsis Fonts). SIL Open Font License, served by Google Fonts.",
        link: { label: "Google Fonts", url: "https://fonts.google.com/specimen/Cormorant+Garamond" },
      },
    ],
  },
  {
    heading: "Textures",
    entries: [
      {
        title: "Sun, planets, Saturn's rings, and the Moon",
        detail: "Solar System Scope, licensed CC BY 4.0. Resized and re-encoded for the web.",
        link: { label: "Solar System Scope", url: "https://www.solarsystemscope.com/textures/" },
      },
      {
        title: "Pluto",
        detail:
          "New Horizons global color mosaic by NASA, Johns Hopkins APL, and Southwest Research Institute. Public domain. Shifted to this site's longitude convention; the unimaged south is shaded, not invented.",
        link: { label: "Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Pluto_color_mapmosaic.jpg" },
      },
      {
        title: "Moons",
        detail:
          "Io, Europa, and Ganymede from Voyager and Galileo (NASA/JPL/USGS); Enceladus from Cassini (NASA/JPL-Caltech/SSI/LPI); Miranda and Triton from Voyager (NASA/JPL/USGS); Charon from New Horizons (NASA/JHUAPL/SwRI). All public domain, via Wikimedia Commons. Resized and re-encoded; unimaged regions are shaded, not invented. Titan is drawn as its orange haze.",
        link: { label: "Wikimedia Commons", url: "https://commons.wikimedia.org/" },
      },
    ],
  },
  {
    heading: "Facts and figures",
    entries: [
      {
        title: "Sources",
        detail:
          "Compiled from NASA Science, NASA, NOAA Ocean Service, and Wikipedia. Each point of interest links to its source. Figures are rounded; sizes and distances on the map are not to scale.",
        link: { label: "NASA Science", url: "https://science.nasa.gov/" },
      },
    ],
  },
  {
    heading: "Made with",
    entries: [
      {
        title: "Software",
        detail: "React, three.js, React Three Fiber, drei, and postprocessing, all MIT licensed. Ambient sound is generated live in your browser. Each world's song follows Johannes Kepler's Harmonices Mundi (1619): its pitch rises and falls with its real orbital speed.",
      },
    ],
  },
];

/** Who made the fonts, textures, and facts this site is built from. */
export function CreditsPanel({ state, onClose, onClosed }: CreditsPanelProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  let i = 0;
  return (
    <SidePanel
      state={state}
      labelledBy="credits-title"
      focusRef={titleRef}
      closeLabel="Close credits"
      onClose={onClose}
      onClosed={onClosed}
    >
      <div className="poi-panel__body">
        <p className="poi-panel__context poi-panel__line" style={line(i++)}>
          Solar System Explorer
        </p>
        <h2 id="credits-title" className="poi-panel__title poi-panel__line" style={line(i++)} ref={titleRef} tabIndex={-1}>
          Credits
        </h2>
        <p className="poi-panel__summary poi-panel__line" style={line(i++)}>
          An independent project, built from the work of others.
        </p>
        {SECTIONS.map((section) => (
          <section key={section.heading} className="credits__section poi-panel__line" style={line(i++)}>
            <h3 className="credits__heading">{section.heading}</h3>
            {section.entries.map((entry) => (
              <div key={entry.title} className="credits__entry">
                <p className="credits__title">{entry.title}</p>
                <p className="credits__detail">{entry.detail}</p>
                {entry.link && (
                  <a className="credits__link" href={entry.link.url} target="_blank" rel="noreferrer">
                    {entry.link.label}
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </SidePanel>
  );
}
