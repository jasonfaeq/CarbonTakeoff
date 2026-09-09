"use client";

import { useState } from "react";
import { groupStyle } from "@/lib/groups";
import { hatchId } from "../Hatch";

export interface DonutDatum {
  key: string;
  value: number;
  /** Material group, for the colour and hatch. Defaults to the key. */
  group?: string;
}

function arc(cx: number, cy: number, r: number, inner: number, start: number, end: number) {
  const large = end - start > Math.PI ? 1 : 0;
  const p = (radius: number, angle: number) => [cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)];
  const [x0, y0] = p(r, start);
  const [x1, y1] = p(r, end);
  const [x2, y2] = p(inner, end);
  const [x3, y3] = p(inner, start);
  return `M${x0} ${y0}A${r} ${r} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${inner} ${inner} 0 ${large} 0 ${x3} ${y3}Z`;
}

/** Start and end angle of each positive datum, clockwise from twelve o'clock, with a small gap. */
function layoutSegments(data: DonutDatum[], total: number, gap: number) {
  const segments: (DonutDatum & { start: number; end: number })[] = [];
  let angle = 0;
  for (const d of data) {
    if (d.value <= 0) continue;
    const sweep = (d.value / total) * Math.PI * 2;
    segments.push({ ...d, start: angle + gap / 2, end: angle + Math.max(sweep - gap / 2, gap / 2 + 0.0001) });
    angle += sweep;
  }
  return segments;
}

/** A ring chart. Hovering a segment shows it in the middle; clicking selects it. */
export function Donut({
  data,
  size = 220,
  thickness = 30,
  format,
  unit,
  label = "Total",
  selected,
  onSelect,
}: {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  format: (value: number) => string;
  unit?: string;
  label?: string;
  selected?: string | null;
  onSelect?: (key: string | null) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const total = data.reduce((s, d) => s + Math.max(d.value, 0), 0);
  const r = size / 2;
  const inner = r - thickness;
  const gap = data.length > 1 ? 0.012 : 0;
  const focus = hover ?? selected ?? null;
  const focused = data.find((d) => d.key === focus);

  const segments = layoutSegments(data, total, gap);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${format(total)} ${unit ?? ""}`}>
        <circle cx={r} cy={r} r={r - thickness / 2} fill="none" strokeWidth={thickness} style={{ stroke: "var(--surface-2)" }} />
        {segments.length === 1 ? (
          <circle
            cx={r}
            cy={r}
            r={r - thickness / 2}
            fill="none"
            strokeWidth={thickness}
            style={{ stroke: `url(#${hatchId(groupStyle(segments[0].group ?? segments[0].key).hatch)})` }}
          />
        ) : (
          segments.map((s) => {
            const dim = focus !== null && focus !== s.key;
            return (
              <path
                key={s.key}
                d={arc(r, r, r, inner, s.start, s.end)}
                style={{ fill: `url(#${hatchId(groupStyle(s.group ?? s.key).hatch)})`, opacity: dim ? 0.35 : 1, transition: "opacity 150ms" }}
                className={onSelect ? "cursor-pointer" : ""}
                onMouseEnter={() => setHover(s.key)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect?.(selected === s.key ? null : s.key)}
              >
                <title>{`${s.key}: ${format(s.value)}${unit ? ` ${unit}` : ""}`}</title>
              </path>
            );
          })
        )}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div className="max-w-[60%]">
          <div className="truncate text-xs text-ink-3">{focused ? focused.key : label}</div>
          <div className="num mt-0.5 text-2xl leading-tight font-semibold tracking-tight">{format(focused ? focused.value : total)}</div>
          <div className="text-xs text-ink-3">{focused && total > 0 ? `${Math.round((focused.value / total) * 100)}% · ${unit ?? ""}` : unit}</div>
        </div>
      </div>
    </div>
  );
}
