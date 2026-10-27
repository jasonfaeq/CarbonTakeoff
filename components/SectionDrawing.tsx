import { hatchId } from "./Hatch";

/**
 * A floor build-up drawn as a section, with the same hatches the charts use.
 * Decoration only: it carries no quantities, so it has nothing to source.
 */
const LAYERS = [
  { hatch: "finishes", label: "Finishes", h: 12 },
  { hatch: "timber", label: "Timber", h: 26 },
  { hatch: "insulation", label: "Insulation", h: 30 },
  { hatch: "concrete", label: "Concrete & cement", h: 48 },
  { hatch: "steel", label: "Steel", h: 14 },
  { hatch: "aggregates", label: "Aggregates", h: 36 },
];

const X = 56;
const W = 190;
const TOP = 58;

const layers = LAYERS.map((l, i) => ({ ...l, y: TOP + LAYERS.slice(0, i).reduce((sum, above) => sum + above.h, 0) }));
const bottom = TOP + LAYERS.reduce((sum, l) => sum + l.h, 0);

export function SectionDrawing() {
  return (
    <svg viewBox="0 0 420 260" className="h-auto w-full" role="img" aria-label="A floor build-up drawn as a section, each material in its own hatch">
      <text x={X} y={30} className="fill-ink-3 font-mono text-[10px] tracking-[0.12em]">
        SECTION A–A
      </text>
      <line x1={X} x2={X + 70} y1={37} y2={37} className="stroke-brand" strokeWidth={2} />

      {/* Section cut marks either side of the build-up. */}
      <path d={`M${X - 10} ${TOP - 12}l6 6-6 6M${X + W + 10} ${TOP - 12}l-6 6 6 6`} className="fill-none stroke-ink-3" strokeWidth={1.2} />

      {layers.map((l, i) => (
        <g key={l.hatch} className="section-layer" style={{ animationDelay: `${120 + i * 70}ms` }}>
          <rect x={X} y={l.y} width={W} height={l.h} style={{ fill: `url(#${hatchId(l.hatch)})` }} />
          <rect x={X} y={l.y} width={W} height={l.h} className="fill-none stroke-ink/40" strokeWidth={0.75} />
          <circle cx={X + W - 22} cy={l.y + l.h / 2} r={2.2} className="fill-ink" />
          <path d={`M${X + W - 22} ${l.y + l.h / 2}H${X + W + 34}l10 ${(i - 2.5) * 6}H${X + W + 66}`} className="fill-none stroke-ink/60" strokeWidth={0.8} />
          <text x={X + W + 70} y={l.y + l.h / 2 + (i - 2.5) * 6 + 3.5} className="fill-ink-2 text-[11px]">
            {l.label}
          </text>
        </g>
      ))}

      {/* Dimension line down the left: the scope of the number, not a size. */}
      <g className="stroke-ink-3" strokeWidth={0.8}>
        <line x1={X - 20} x2={X - 20} y1={TOP} y2={bottom} />
        <line x1={X - 26} x2={X - 4} y1={TOP} y2={TOP} />
        <line x1={X - 26} x2={X - 4} y1={bottom} y2={bottom} />
        <path d={`M${X - 23} ${TOP + 3}l3-3 3 3M${X - 23} ${bottom - 3}l3 3 3-3`} className="fill-none" />
      </g>
      <text
        transform={`translate(${X - 25} ${(TOP + bottom) / 2}) rotate(-90)`}
        textAnchor="middle"
        className="fill-ink-3 font-mono text-[10px] tracking-[0.08em]"
      >
        A1–A3
      </text>

      {/* Ground line under the build-up. */}
      <path d={`M${X - 30} ${bottom}H${X + W + 30}`} className="stroke-ink-2" strokeWidth={1.2} />
      <path
        d={Array.from({ length: 13 }, (_, i) => `M${X - 24 + i * 19} ${bottom + 2}l-7 9`).join("")}
        className="stroke-ink-3"
        strokeWidth={0.8}
      />
    </svg>
  );
}
