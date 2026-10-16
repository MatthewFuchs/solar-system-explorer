import { useEffect, useRef, type AnimationEvent, type CSSProperties } from "react";
import type { POI } from "../data/solarSystem";
import { StatList } from "./StatList";

export type PanelState = "open" | "closing";

interface PoiPanelProps {
  poi: POI;
  planetName: string;
  numeral: string;
  state: PanelState;
  onClose: () => void;
  /** Called once the closing animation has finished, to unmount the panel. */
  onClosed: () => void;
}

/** Stagger index for the reveal; each line enters a beat after the one above it. */
const line = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * Point-of-interest details as an editorial sidebar (a bottom sheet on phones).
 * Non-modal: it closes with its X, Escape, or a click on empty space, while clicks
 * on markers or Previous / Next switch the point of interest instead.
 */
export function PoiPanel({ poi, planetName, numeral, state, onClose, onClosed }: PoiPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Move focus into the panel when it opens, and give it back when it closes.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    titleRef.current?.focus({ preventScroll: true });
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (state !== "open") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Closing the panel takes this Escape; it shouldn't also leave the planet view.
      e.preventDefault();
      onClose();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target || panelRef.current?.contains(target) || target.closest("button, a, [role='dialog']")) return;
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [state, onClose]);

  const onAnimationEnd = (e: AnimationEvent) => {
    if (e.target === e.currentTarget && state === "closing") onClosed();
  };

  let i = 0;
  return (
    <aside
      ref={panelRef}
      className="poi-panel"
      data-state={state}
      role="dialog"
      aria-labelledby="poi-panel-title"
      onAnimationEnd={onAnimationEnd}
    >
      {/* Keyed so the staggered reveal replays when the point of interest changes. */}
      <div className="poi-panel__body" key={poi.id}>
        <p className="poi-panel__context poi-panel__line" style={line(i++)}>
          <span className="poi-panel__numeral">{numeral}</span>
          <span className="poi-panel__rule" aria-hidden="true" />
          {planetName}
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

      {/* Last in tab order (after the content), though it sits top-right. */}
      <button type="button" className="poi-panel__close" onClick={onClose} aria-label="Close details">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M2 2 14 14M14 2 2 14" />
        </svg>
      </button>
    </aside>
  );
}
