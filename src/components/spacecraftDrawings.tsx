// Spacecraft as small hairline technical drawings, in the overview's engraved style.
// These are art assets (like textures); the data file picks one per spacecraft by key.
import type { ReactElement } from "react";
import type { SpacecraftDrawing } from "../data/solarSystem";

const DRAWINGS: Record<SpacecraftDrawing, ReactElement> = {
  // High-gain dish over a small bus, with the long magnetometer boom, the RTG boom
  // with its three power units, and the science boom.
  voyager: (
    <>
      <ellipse cx="0" cy="-6" rx="9" ry="3.2" />
      <ellipse cx="0" cy="-6" rx="5.5" ry="1.9" className="sc-faint" />
      <path d="M0 -6V-11M-2.4 -9.2 0 -11 2.4 -9.2" className="sc-faint" />
      <rect x="-3" y="-3" width="6" height="4.2" />
      <path d="M3 -0.5 19 8.5" />
      <path d="M-3 0.5 -14.5 6.5" />
      <path d="M-6.2 1.2-8.2 4.6M-9.2 2.8-11.2 6.2M-12.2 4.3-14.2 7.7" className="sc-faint" />
      <path d="M1.5 1.2 7.5 12" />
      <rect x="6" y="11.2" width="3.4" height="2.4" />
    </>
  ),
  // The segmented hexagonal mirror and its secondary-mirror tripod, over the layered sunshield.
  jwst: (
    <>
      <path d="M0 -14.5 6.4 -10.8V-3.4L0 0.3-6.4 -3.4V-10.8Z" />
      <path d="M0 -14.5V0.3M-6.4 -10.8 6.4 -3.4M6.4 -10.8-6.4 -3.4" className="sc-faint" />
      <path d="M-6.4 -10.8 0 -18.5 6.4 -10.8M0 -18.5V-14.5" className="sc-faint" />
      <circle cx="0" cy="-18.5" r="0.9" />
      <path d="M-16 6 0 1.8 16 6 0 11.4Z" />
      <path d="M-11.5 6.2 0 3.3 11.5 6.2M-11.5 6.8 0 9.9 11.5 6.8" className="sc-faint" />
    </>
  ),
  // Three long solar arrays around a hexagonal body.
  juno: (
    <>
      <path d="M0 -3.2 2.8 -1.6V1.6L0 3.2-2.8 1.6V-1.6Z" />
      <circle cx="0" cy="0" r="1.3" className="sc-faint" />
      <g>
        <rect x="3.2" y="-1.6" width="15" height="3.2" />
        <path d="M8.2 -1.6V1.6M13.2 -1.6V1.6" className="sc-faint" />
      </g>
      <g transform="rotate(120)">
        <rect x="3.2" y="-1.6" width="15" height="3.2" />
        <path d="M8.2 -1.6V1.6M13.2 -1.6V1.6" className="sc-faint" />
      </g>
      <g transform="rotate(240)">
        <rect x="3.2" y="-1.6" width="15" height="3.2" />
        <path d="M8.2 -1.6V1.6M13.2 -1.6V1.6" className="sc-faint" />
      </g>
    </>
  ),
  // The heat shield facing the Sun, the truss behind it, angled solar wings, and the antenna.
  parker: (
    <>
      <ellipse cx="0" cy="-9" rx="10" ry="2.6" className="sc-solid" />
      <path d="M-5 -7.2-3 -3.6M5 -7.2 3 -3.6M0 -6.4V-3.6" className="sc-faint" />
      <path d="M-3.4 -3.6H3.4L4.2 5H-4.2Z" />
      <path d="M-4 -0.5-11 3.2-10.2 5.2-3.6 1.6M4 -0.5 11 3.2 10.2 5.2 3.6 1.6" />
      <path d="M0 5V11" />
      <circle cx="0" cy="12" r="1.2" />
    </>
  ),
  // Triangular body with its dish, and the plutonium generator reaching out to one side.
  "new-horizons": (
    <>
      <path d="M-7 6H7L0 -5Z" />
      <ellipse cx="0" cy="-5.5" rx="7.5" ry="2.4" />
      <ellipse cx="0" cy="-5.5" rx="4.4" ry="1.4" className="sc-faint" />
      <path d="M5 3.2 15 7.2M5.6 5.2 14.2 8.8" />
      <path d="M15 7.2 14.2 8.8" />
      <path d="M8.2 4.6 7.6 6.3M11.2 5.8 10.6 7.5" className="sc-faint" />
    </>
  ),
  // The long truss with its four pairs of solar wings, and the pressurized modules
  // crossing it at the center.
  iss: (
    <>
      <path d="M-17.5 0H17.5" />
      <path d="M-17 -11.5h3v10h-3ZM-17 1.5h3v10h-3ZM-12.5 -11.5h3v10h-3ZM-12.5 1.5h3v10h-3ZM9.5 -11.5h3v10h-3ZM9.5 1.5h3v10h-3ZM14 -11.5h3v10h-3ZM14 1.5h3v10h-3Z" />
      <path d="M-17 -6.5h3M-17 6.5h3M-12.5 -6.5h3M-12.5 6.5h3M9.5 -6.5h3M9.5 6.5h3M14 -6.5h3M14 6.5h3" className="sc-faint" />
      <rect x="-1.6" y="-8.5" width="3.2" height="17" />
      <path d="M-4.6 -5.5h3M1.6 -5.5h3M-4.6 4.5h3M1.6 4.5h3" />
      <path d="M-4.5 1.5-6.8 5.5M4.5 1.5 6.8 5.5" className="sc-faint" />
    </>
  ),
  // The curved sunshade in front of the body, two small solar panels on arms, and the
  // magnetometer boom trailing behind.
  messenger: (
    <>
      <path d="M-9 -9.5Q0 -12.5 9 -9.5V-7Q0 -10 -9 -7Z" />
      <rect x="-5" y="-6" width="10" height="9" />
      <path d="M-5 -1.5H-8M5 -1.5H8" />
      <path d="M-15 -4h7v5h-7ZM8 -4h7v5h-7Z" />
      <path d="M-12.7 -4V1M-10.3 -4V1M10.3 -4V1M12.7 -4V1" className="sc-faint" />
      <path d="M0 3V14" className="sc-faint" />
      <circle cx="0" cy="15" r="1" />
    </>
  ),
};

export function SpacecraftDrawingSvg({ drawing, size = 40 }: { drawing: SpacecraftDrawing; size?: number }) {
  return (
    <svg className="sc-drawing" viewBox="-20 -20 40 40" width={size} height={size} aria-hidden="true">
      {DRAWINGS[drawing]}
    </svg>
  );
}
