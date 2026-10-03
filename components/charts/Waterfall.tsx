"use client";

import { groupStyle } from "@/lib/groups";

export interface WaterfallStep {
  key: string;
  label: string;
  /** How much this step takes off the running total. */
  value: number;
  group?: string;
}

/** Where each saving starts and ends on the running total, from the baseline down. */
function stepRows(baseline: number, steps: WaterfallStep[]) {
  const rows: (WaterfallStep & { from: number; to: number })[] = [];
  let running = baseline;
  for (const s of steps) {
    rows.push({ ...s, from: running - s.value, to: running });
    running -= s.value;
  }
  return rows;
}

/**
 * Baseline at the top, one row per saving, the scenario at the bottom. Horizontal, so long
 * BOM descriptions stay readable; each saving bar floats where it leaves the running total.
 */
export function Waterfall({
  baseline,
  steps,
  result,
  format,
  baselineLabel = "Baseline",
  resultLabel = "Scenario",
}: {
  baseline: number;
  steps: WaterfallStep[];
  result: number;
  format: (v: number) => string;
  baselineLabel?: string;
  resultLabel?: string;
}) {
  const max = Math.max(baseline, result, 1);
  const rows = stepRows(baseline, steps);
  const pct = (v: number) => `${(Math.max(v, 0) / max) * 100}%`;

  return (
    <ol className="grid gap-1.5 text-sm">
      <li className="grid grid-cols-[minmax(8rem,15rem)_1fr_5.5rem] items-center gap-3">
        <span className="truncate font-medium">{baselineLabel}</span>
        <span className="relative h-6 rounded-md bg-surface-2">
          <span className="absolute inset-y-0 left-0 rounded-md bg-ink-3/70" style={{ width: pct(baseline) }} />
        </span>
        <span className="num text-right font-medium">{format(baseline)}</span>
      </li>
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(8rem,15rem)_1fr_5.5rem] items-center gap-3" title={r.label}>
          <span className="truncate text-ink-2">{r.label}</span>
          <span className="relative h-6">
            <span className="absolute inset-y-[11px] left-0 border-t border-dashed border-line-2" style={{ width: pct(r.to) }} />
            <span
              className="absolute inset-y-1 rounded"
              style={{ left: pct(r.from), width: pct(r.to - r.from), background: r.group ? groupStyle(r.group).color : "var(--good)" }}
            />
          </span>
          <span className="num text-right text-good">−{format(r.value)}</span>
        </li>
      ))}
      <li className="grid grid-cols-[minmax(8rem,15rem)_1fr_5.5rem] items-center gap-3 border-t border-line pt-2">
        <span className="truncate font-medium">{resultLabel}</span>
        <span className="relative h-6 rounded-md bg-surface-2">
          <span className="absolute inset-y-0 left-0 rounded-md bg-brand" style={{ width: pct(result) }} />
        </span>
        <span className="num text-right font-semibold">{format(result)}</span>
      </li>
    </ol>
  );
}
