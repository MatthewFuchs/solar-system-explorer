import { useState } from "react";
import { GOLDEN_RECORD } from "../data/mysteries";
import { journey } from "../lib/journey";

/**
 * An easter egg in the Voyagers' details: a small engraved disc at the foot of the panel, with
 * no label. Opened, it becomes a hairline drawing after the record's cover (the record and its
 * stylus, the map of pulsars that places the Sun, the hydrogen atom that sets the unit of
 * time), with what the record carries.
 */
export function GoldenRecord() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        className="golden-record__disc"
        aria-label="A golden disc"
        onClick={() => {
          setOpen(true);
          journey.discover("golden-record");
        }}
      >
        <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
          <circle cx="20" cy="20" r="18" />
          <circle cx="20" cy="20" r="14" opacity="0.5" />
          <circle cx="20" cy="20" r="10" opacity="0.5" />
          <circle cx="20" cy="20" r="3" />
        </svg>
      </button>
    );
  }
  return (
    <figure className="golden-record">
      <CoverDrawing />
      <figcaption>
        <p className="golden-record__title">{GOLDEN_RECORD.title}</p>
        <ul className="poi-panel__facts">
          {GOLDEN_RECORD.facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <a className="poi-panel__source" href={GOLDEN_RECORD.source.url} target="_blank" rel="noreferrer">
          {GOLDEN_RECORD.source.label}
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </figcaption>
    </figure>
  );
}

/** Fourteen pulsars' directions (degrees) and relative distances: an engraving's rhythm, not a star chart. */
const PULSARS: [number, number][] = [
  [8, 0.95], [31, 0.55], [52, 0.8], [77, 0.4], [101, 0.7], [128, 0.5], [149, 0.9],
  [172, 0.6], [203, 0.75], [228, 0.45], [251, 0.85], [279, 0.5], [306, 0.65], [333, 0.8],
];

function CoverDrawing() {
  const cx = 70;
  const cy = 180;
  return (
    <svg className="golden-record__cover" viewBox="0 0 280 260" role="img" aria-label="A drawing after the Golden Record's cover: the record and stylus, a map of pulsars, and the hydrogen atom">
      {/* The record, seen from above, and its stylus. */}
      <circle cx="70" cy="62" r="44" />
      <circle cx="70" cy="62" r="34" opacity="0.45" />
      <circle cx="70" cy="62" r="24" opacity="0.45" />
      <circle cx="70" cy="62" r="5" />
      <path d="M118 30 L84 54" />
      <circle cx="118" cy="30" r="2.5" />
      {/* The record seen edge-on, with the stylus resting on it. */}
      <path d="M150 52 H260 M200 52 V30 M196 30 H204" />
      <path d="M150 70 h14 m4 0 h6 m4 0 h18 m4 0 h8 m4 0 h22 m4 0 h12" opacity="0.7" />
      {/* The pulsar map: the Sun at the centre, fourteen pulsars around it, and the long line to the galaxy's centre. */}
      {PULSARS.map(([a, d], i) => {
        const r = 22 + d * 44;
        const x = cx + r * Math.cos((a * Math.PI) / 180);
        const y = cy - r * Math.sin((a * Math.PI) / 180);
        // Each line carries short ticks, as the original's lines carry each pulsar's period.
        const ticks = Array.from({ length: 2 + (i % 4) }, (_, k) => {
          const t = 0.35 + k * 0.14;
          const tx = cx + r * t * Math.cos((a * Math.PI) / 180);
          const ty = cy - r * t * Math.sin((a * Math.PI) / 180);
          const nx = 3 * Math.sin((a * Math.PI) / 180);
          const ny = 3 * Math.cos((a * Math.PI) / 180);
          return `M${(tx - nx).toFixed(1)} ${(ty - ny).toFixed(1)} L${(tx + nx).toFixed(1)} ${(ty + ny).toFixed(1)}`;
        }).join(" ");
        return <path key={a} d={`M${cx} ${cy} L${x.toFixed(1)} ${y.toFixed(1)} ${ticks}`} opacity={0.85} />;
      })}
      <path d={`M${cx} ${cy} H${cx + 130}`} />
      <circle cx={cx} cy={cy} r="2.5" className="golden-record__sun" />
      {/* The hydrogen atom in its two states: the flip between them sets the unit of time. */}
      <circle cx="214" cy="204" r="14" />
      <circle cx="254" cy="204" r="14" />
      <circle cx="214" cy="204" r="2" className="golden-record__sun" />
      <circle cx="254" cy="204" r="2" className="golden-record__sun" />
      <path d="M214 186 v-8 M254 222 v8 M228 204 H240" />
      <path d="M214 240 H254 M214 236 v8 M254 236 v8" opacity="0.7" />
    </svg>
  );
}
