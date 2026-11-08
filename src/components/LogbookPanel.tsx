import { useRef, useState } from "react";
import { MYSTERIES } from "../data/mysteries";
import { journey, useJourney } from "../lib/journey";
import { line } from "./panelLine";
import { SidePanel, type PanelState } from "./SidePanel";

interface LogbookPanelProps {
  state: PanelState;
  onClose: () => void;
  onClosed: () => void;
}

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * The observer's logbook: what has been discovered, inked in with the day it was found, and
 * the clues to what hasn't, engraved faintly. No scores, counts, or totals.
 */
export function LogbookPanel({ state, onClose, onClosed }: LogbookPanelProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const s = useJourney();
  const [confirming, setConfirming] = useState(false);
  let i = 0;
  return (
    <SidePanel
      state={state}
      labelledBy="logbook-title"
      focusRef={titleRef}
      closeLabel="Close logbook"
      onClose={onClose}
      onClosed={onClosed}
    >
      <div className="poi-panel__body logbook">
        <p className="poi-panel__context poi-panel__line" style={line(i++)}>
          Observer's log
        </p>
        <h2
          id="logbook-title"
          className="poi-panel__title poi-panel__line"
          style={line(i++)}
          ref={titleRef}
          tabIndex={-1}
        >
          Logbook
        </h2>
        <ol className="logbook__entries">
          {MYSTERIES.map((m) => {
            const at = s.found[m.id];
            return (
              <li
                key={m.id}
                className="logbook__entry poi-panel__line"
                style={line(i++)}
                data-found={at !== undefined}
              >
                {at !== undefined ? (
                  <>
                    <p className="logbook__title">{m.title}</p>
                    <p className="logbook__date">{DATE.format(at)}</p>
                    <p className="logbook__text">{m.entry}</p>
                  </>
                ) : (
                  <p className="logbook__clue">
                    <span className="visually-hidden">
                      Not yet found. Clue:{" "}
                    </span>
                    {m.clue}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        <div className="logbook__forget poi-panel__line" style={line(i++)}>
          {confirming ? (
            <p role="group" aria-label="Forget your journey?">
              <span>Forget every entry, and where you've been?</span>{" "}
              <button
                type="button"
                onClick={() => {
                  journey.forget();
                  onClose();
                }}
              >
                Forget
              </button>{" "}
              <button type="button" onClick={() => setConfirming(false)}>
                Keep it
              </button>
            </p>
          ) : (
            <button type="button" onClick={() => setConfirming(true)}>
              Forget my journey
            </button>
          )}
        </div>
      </div>
    </SidePanel>
  );
}
