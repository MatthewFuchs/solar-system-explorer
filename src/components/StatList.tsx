import type { CSSProperties } from "react";
import type { POIStat } from "../data/solarSystem";

interface StatListProps {
  stats: POIStat[];
  /** panel: the detail panel's grid; feature: the planet view column; label: overview hover label. */
  variant: "panel" | "feature" | "label";
  className?: string;
  style?: CSSProperties;
}

/** Measurements as data labels: a small-caps label above a number and its unit. */
export function StatList({ stats, variant, className, style }: StatListProps) {
  return (
    <dl className={`stats stats--${variant}${className ? ` ${className}` : ""}`} style={style}>
      {stats.map((s) => (
        <div key={s.label} className="stats__item">
          <dt>{s.label}</dt>
          <dd>
            {s.value}
            {s.unit && (
              // Degree and percent signs sit tight against the number.
              <span className="stats__unit" data-tight={/^[°%]/.test(s.unit)}>
                {s.unit}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
