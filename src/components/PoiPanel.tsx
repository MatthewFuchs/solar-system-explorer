import { useEffect, useRef } from "react";
import { journey } from "../lib/journey";
import type { POIContent } from "../data/solarSystem";
import { SidePanel, type PanelState } from "./SidePanel";
import { line } from "./panelLine";
import { StatList } from "./StatList";

export type { PanelState };

interface PoiPanelProps {
  poi: POIContent;
  /** Context line above the title: a short mark (numeral, launch year) and a label. */
  eyebrow: { mark?: string; label: string };
  state: PanelState;
  onClose: () => void;
  /** Called once the closing animation has finished, to unmount the panel. */
  onClosed: () => void;
}


/** Details for a point of interest, spacecraft, or belt. */
export function PoiPanel({ poi, eyebrow, state, onClose, onClosed }: PoiPanelProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  // Reading a point of interest is part of the journey (the logbook counts what's been read).
  useEffect(() => {
    journey.record({ type: "read", id: poi.id });
  }, [poi.id]);

  let i = 0;
  return (
    <SidePanel
      state={state}
      labelledBy="poi-panel-title"
      focusRef={titleRef}
      closeLabel="Close details"
      onClose={onClose}
      onClosed={onClosed}
    >
      {/* Keyed so the staggered reveal replays when the point of interest changes. */}
      <div className="poi-panel__body" key={poi.id}>
        <p className="poi-panel__context poi-panel__line" style={line(i++)}>
          {eyebrow.mark && (
            <>
              <span className="poi-panel__numeral">{eyebrow.mark}</span>
              <span className="poi-panel__rule" aria-hidden="true" />
            </>
          )}
          {eyebrow.label}
        </p>
        <h2 id="poi-panel-title" className="poi-panel__title poi-panel__line" style={line(i++)} ref={titleRef} tabIndex={-1}>
          {poi.name}
        </h2>
        <p className="poi-panel__category poi-panel__line" style={line(i++)}>
          {poi.category}
        </p>
        <p className="poi-panel__summary poi-panel__line" style={line(i++)}>
          {poi.summary}
        </p>

        {poi.image && (
          <figure className="poi-panel__figure poi-panel__line" style={line(i++)}>
            <img src={poi.image.src} alt={poi.image.alt} loading="lazy" />
            {poi.image.credit && <figcaption>{poi.image.credit}</figcaption>}
          </figure>
        )}

        {poi.stats && poi.stats.length > 0 && (
          <StatList stats={poi.stats} variant="panel" className="poi-panel__line" style={line(i++)} />
        )}

        <ul className="poi-panel__facts">
          {poi.facts.map((fact) => (
            <li key={fact} className="poi-panel__line" style={line(i++)}>
              {fact}
            </li>
          ))}
        </ul>

        {poi.source && (
          <a
            className="poi-panel__source poi-panel__line"
            style={line(i++)}
            href={poi.source.url}
            target="_blank"
            rel="noreferrer"
          >
            Learn more on {poi.source.label}
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </SidePanel>
  );
}
