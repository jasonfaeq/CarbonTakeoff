"use client";

import { useState } from "react";
import { squarify } from "@/lib/charts/treemap";
import { hatchId } from "../Hatch";
import { groupStyle } from "@/lib/groups";
import { useSize } from "./useSize";

export interface TreemapDatum {
  id: string;
  label: string;
  value: number;
  group: string;
  detail?: string;
}

/** Every counted line as a tile, sized by its carbon and hatched by its material. */
export function Treemap({
  data,
  height = 320,
  format,
  onSelect,
}: {
  data: TreemapDatum[];
  height?: number;
  format: (value: number) => string;
  onSelect?: (id: string) => void;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<{ datum: TreemapDatum; x: number; y: number } | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const tiles = squarify(
    data.map((d) => ({ value: d.value, item: d })),
    size.width,
    height,
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Counted lines sized by their carbon"
      className="relative w-full overflow-hidden rounded-xl"
      style={{ height }}
      onMouseLeave={() => setHover(null)}
    >
      {tiles.map(({ item, x, y, w, h }) => {
        const big = w > 90 && h > 44;
        const medium = w > 54 && h > 26;
        return (
          <button
            key={item.id}
            type="button"
            className="group absolute overflow-hidden text-left outline-offset-[-2px]"
            style={{ left: x, top: y, width: w, height: h }}
            onMouseMove={(e) => {
              const box = ref.current!.getBoundingClientRect();
              setHover({ datum: item, x: e.clientX - box.left, y: e.clientY - box.top });
            }}
            onClick={() => onSelect?.(item.id)}
            aria-label={`${item.label}: ${format(item.value)}`}
          >
            <svg aria-hidden="true" className="absolute inset-[1px] h-[calc(100%-2px)] w-[calc(100%-2px)] rounded-md">
              <rect width="100%" height="100%" style={{ fill: `url(#${hatchId(groupStyle(item.group).hatch)})` }} />
              <rect
                width="100%"
                height="100%"
                className="opacity-0 transition-opacity group-hover:opacity-100"
                style={{ fill: "rgb(255 255 255 / 0.12)" }}
              />
            </svg>
            {medium && (
              <span className="absolute inset-[1px] flex flex-col justify-between p-2 text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.45)]">
                <span className={`line-clamp-2 leading-tight font-medium ${big ? "text-[13px]" : "text-[11px]"}`}>{item.label}</span>
                {big && <span className="num text-[13px] opacity-90">{format(item.value)}</span>}
              </span>
            )}
          </button>
        );
      })}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 max-w-64 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md"
          style={{
            left: Math.min(hover.x + 14, Math.max(size.width - 260, 0)),
            top: hover.y + 14 > height - 70 ? hover.y - 70 : hover.y + 14,
          }}
        >
          <div className="font-medium text-ink">{hover.datum.label}</div>
          <div className="num mt-0.5 text-ink-2">
            {format(hover.datum.value)} · {total > 0 ? Math.round((hover.datum.value / total) * 100) : 0}% of total
          </div>
          <div className="mt-0.5 text-ink-3">{hover.datum.detail ?? hover.datum.group}</div>
        </div>
      )}
    </div>
  );
}
