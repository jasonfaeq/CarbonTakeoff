"use client";

import { useState } from "react";
import { bandPath, layoutSankey, spreadLabels, type SankeyLink } from "@/lib/charts/sankey";
import { groupStyle } from "@/lib/groups";
import { hatchId } from "../Hatch";
import { useSize } from "./useSize";

const LABEL = 150;
const BAR = 10;

/** Sections of the BOM on the left, material groups on the right, bands sized by carbon. */
export function Sankey({ links, height = 300, format }: { links: SankeyLink[]; height?: number; format: (v: number) => string }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const width = size.width;
  const narrow = width < 560;
  const label = narrow ? 96 : LABEL;
  const layout = layoutSankey(links, height, 10);
  const x0 = label + BAR;
  const x1 = width - label - BAR;
  const total = links.reduce((s, l) => s + l.value, 0);
  const active = (source: string, target: string) => hover === null || hover === source || hover === target;
  // A node with room for two lines shows its value too; the rest get one line, spread so they never overlap.
  const leftY = spreadLabels(
    layout.left.map((n) => n.y + n.h / 2),
    15,
    height,
  );
  const rightY = spreadLabels(
    layout.right.map((n) => n.y + n.h / 2),
    15,
    height,
  );

  return (
    <div ref={ref} className="w-full">
      {width > 0 && x1 > x0 && (
        <svg width={width} height={height} role="img" aria-label="Carbon by BOM section and material" className="overflow-visible">
          {layout.bands.map((b) => (
            <path
              key={`${b.source}-${b.target}`}
              d={bandPath(b, x0, x1)}
              style={{ fill: groupStyle(b.target).color, opacity: active(b.source, b.target) ? 0.38 : 0.08, transition: "opacity 150ms" }}
            >
              <title>{`${b.source} → ${b.target}: ${format(b.value)}`}</title>
            </path>
          ))}
          {layout.left.map((n, i) => (
            <g key={n.id} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} className="cursor-default">
              <rect x={label} y={n.y} width={BAR} height={Math.max(n.h, 1)} rx={2} style={{ fill: "var(--ink-2)" }} />
              <text x={label - 8} y={leftY[i]} textAnchor="end" dominantBaseline="middle" className="text-[12px]" style={{ fill: "var(--ink)" }}>
                {n.id.length > (narrow ? 12 : 20) ? `${n.id.slice(0, narrow ? 11 : 19)}…` : n.id}
              </text>
              {n.h > 30 && (
                <text
                  x={label - 8}
                  y={(layout.left.includes(n) ? leftY[i] : rightY[i]) + 14}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="num text-[11px]"
                  style={{ fill: "var(--ink-3)" }}
                >
                  {format(n.value)}
                </text>
              )}
            </g>
          ))}
          {layout.right.map((n, i) => (
            <g key={n.id} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} className="cursor-default">
              <rect x={x1} y={n.y} width={BAR} height={Math.max(n.h, 1)} rx={2} style={{ fill: `url(#${hatchId(groupStyle(n.id).hatch)})` }} />
              <text x={x1 + BAR + 8} y={rightY[i]} dominantBaseline="middle" className="text-[12px]" style={{ fill: "var(--ink)" }}>
                {n.id.length > (narrow ? 12 : 22) ? `${n.id.slice(0, narrow ? 11 : 21)}…` : n.id}
              </text>
              {n.h > 30 && (
                <text
                  x={x1 + BAR + 8}
                  y={(layout.left.includes(n) ? leftY[i] : rightY[i]) + 14}
                  dominantBaseline="middle"
                  className="num text-[11px]"
                  style={{ fill: "var(--ink-3)" }}
                >
                  {format(n.value)} · {total > 0 ? Math.round((n.value / total) * 100) : 0}%
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
      {width === 0 && <div style={{ height }} />}
    </div>
  );
}
