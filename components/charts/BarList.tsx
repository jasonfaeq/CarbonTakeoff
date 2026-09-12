"use client";

import { groupStyle } from "@/lib/groups";
import { Swatch } from "../ui";

export interface BarDatum {
  key: string;
  label?: string;
  value: number;
  group?: string;
  /** Overrides the group colour, and drops the hatch swatch. */
  color?: string;
  detail?: string;
}

/** Horizontal bars with a swatch, the value and its share of the total. */
export function BarList({
  data,
  total,
  format,
  selected,
  onSelect,
}: {
  data: BarDatum[];
  total?: number;
  format: (value: number) => string;
  selected?: string | null;
  onSelect?: (key: string | null) => void;
}) {
  const max = Math.max(...data.map((d) => d.value), 0) || 1;
  const sum = total ?? data.reduce((s, d) => s + d.value, 0);
  return (
    <ul className="grid gap-1">
      {data.map((d) => {
        const share = sum > 0 ? (d.value / sum) * 100 : 0;
        const dim = selected != null && selected !== d.key;
        const content = (
          <>
            <span className="flex min-w-0 items-center gap-2">
              {d.color ? <span className="swatch" style={{ background: d.color }} /> : <Swatch group={d.group ?? d.key} />}
              <span className="truncate">{d.label ?? d.key}</span>
            </span>
            <span className="relative h-2 overflow-hidden rounded-full bg-surface-3">
              <span
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
                style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? groupStyle(d.group ?? d.key).color }}
              />
            </span>
            <span className="num text-right whitespace-nowrap">
              {format(d.value)} <span className="inline-block w-10 text-ink-3">{share >= 0.5 ? `${Math.round(share)}%` : "<1%"}</span>
            </span>
          </>
        );
        const cls = `grid grid-cols-[minmax(7rem,11rem)_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-opacity ${dim ? "opacity-40" : ""}`;
        return (
          <li key={d.key} title={d.detail}>
            {onSelect ? (
              <button
                className={`${cls} w-full text-left hover:bg-surface-2`}
                aria-pressed={selected === d.key}
                onClick={() => onSelect(selected === d.key ? null : d.key)}
              >
                {content}
              </button>
            ) : (
              <div className={cls}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
