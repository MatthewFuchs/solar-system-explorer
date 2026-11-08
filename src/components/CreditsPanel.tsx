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
        detail: "Designed by Brian J. Bonislawsky (Astigmatic). SIL Open Font License, self-hosted via Fontsource.",
        link: { label: "Google Fonts", url: "https://fonts.google.com/specimen/Marcellus" },
      },
      {
        title: "Cormorant Garamond",
        detail: "Designed by Christian Thalmann (Catharsis Fonts). SIL Open Font License, self-hosted via Fontsource.",
        link: { label: "Google Fonts", url: "https://fonts.google.com/specimen/Cormorant+Garamond" },
      },
    ],
  },
  {
    heading: "Textures",
    entries: [
      {
        title: "Sun, planets, Saturn's rings, and the Moon",
        detail: "Solar System Scope, licensed CC BY 4.0. Resized and re-encoded for the web. The other stars reuse the Sun's map, recoloured to each star's light.",
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
          "Compiled from NASA (NASA Science, Webb, the NASA Exoplanet Catalog, the Chandra X-ray Center, the Scientific Visualization Studio, JPL, and the Astrophysics Data System), the Space Telescope Science Institute, NOAA Ocean Service, ESA/Hubble, ESA/Webb, the European Southern Observatory and the Event Horizon Telescope, NSF NOIRLab, W. M. Keck Observatory, Green Bank Observatory, the American Astronomical Society, the Nobel Foundation, peer-reviewed papers via arXiv, Sky & Telescope, and EarthSky. Each point of interest links to its source. Figures are rounded. The solar system's sizes and distances are not to scale; the neighbourhood and the Milky Way place everything at its real distance, and the galaxy's spiral arms are a sketch.",
        link: { label: "NASA Science", url: "https://science.nasa.gov/" },
      },
    ],
  },
  {
    heading: "Your logbook",
    entries: [
      {
        title: "Kept only in this browser",
        detail:
          "Once you discover something, a logbook appears. It and the places you've been are kept in this browser's local storage (one entry, sse-journey-v1) and are never sent anywhere: this site has no server, no cookies, and no analytics. Forget it from the logbook at any time.",
      },
    ],
  },
  {
    heading: "Made with",
    entries: [
      {
        title: "Software",
        detail: "React, three.js, React Three Fiber, drei, and postprocessing, all MIT licensed. Ambient sound is generated live in your browser. Each world's song follows Johannes Kepler's Harmonices Mundi (1619): its pitch rises and falls with its real orbital speed. Other stars sing chords pitched by how hot they are; the galaxy's landmarks sing after what they are, the Crab Nebula at its pulsar's real 30 beats a second.",
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
