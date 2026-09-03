import { GROUP_ORDER, groupStyle } from "@/lib/groups";

/** The section hatch drawn over each material colour, as on a construction drawing. */
const MARKS: Record<string, { size: number; d?: string; dots?: [number, number, number][] }> = {
  concrete: {
    size: 6,
    dots: [
      [1.4, 1.6, 0.6],
      [4.3, 3.8, 0.55],
      [2.2, 5, 0.45],
      [5.3, 0.8, 0.4],
    ],
  },
  steel: { size: 6, d: "M-1 1l2-2M0 6l6-6M5 7l2-2" },
  aluminium: { size: 7, d: "M-1 6l2 2M0 0l7 7M6-1l2 2" },
  copper: { size: 6, d: "M-1 1l2-2M0 6l6-6M5 7l2-2M-1 5l2 2M0 0l6 6M5-1l2 2" },
  plastics: { size: 5, d: "M0 2.5h5" },
  aggregates: {
    size: 8,
    dots: [
      [2, 2, 1.1],
      [6, 4.5, 1],
      [3, 6.8, 0.8],
    ],
  },
  timber: { size: 8, d: "M2 0c1 2-1 6 0 8M6 0c1 2-1 6 0 8" },
  masonry: { size: 8, d: "M0 0.5h8M0 4.5h8M4 0.5v4M0 4.5v4M8 4.5v4" },
  glass: { size: 8, d: "M0 8l8-8" },
  insulation: { size: 8, d: "M0 5l2-3 2 3 2-3 2 3" },
  finishes: { size: 4, dots: [[2, 2, 0.45]] },
  electrical: { size: 4, d: "M1 0v4" },
  transport: { size: 6, d: "M0 3h3" },
  other: { size: 6 },
};

export function hatchId(hatch: string) {
  return `hatch-${hatch}`;
}

/** Rendered once in the layout. Every chart and swatch points at these by id. */
export function HatchDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="pointer-events-none absolute">
      <defs>
        {GROUP_ORDER.map((group) => {
          const { color, hatch } = groupStyle(group);
          const mark = MARKS[hatch];
          return (
            <pattern key={hatch} id={hatchId(hatch)} patternUnits="userSpaceOnUse" width={mark.size} height={mark.size}>
              <rect width={mark.size} height={mark.size} style={{ fill: color }} />
              {mark.d && <path d={mark.d} style={{ stroke: "var(--hatch-ink)", fill: "none" }} strokeWidth={0.8} />}
              {mark.dots?.map(([cx, cy, r], i) => (
                <circle key={i} cx={cx} cy={cy} r={r} style={{ fill: "var(--hatch-ink)" }} />
              ))}
            </pattern>
          );
        })}
      </defs>
    </svg>
  );
}
