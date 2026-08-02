"use client";

import { catalogue, spendData } from "@/lib/catalogue";
import { alternativesFor, compareAccounting, defaultComparisonLines, isCounted, type BomLine, type CalcOptions } from "@/lib/engine";
import { tonnes } from "@/lib/format";
import { actions } from "@/lib/store";

function change(before: number, after: number) {
  if (before === 0) return 0;
  return ((after - before) / before) * 100;
}

function signed(value: number) {
  const r = Number(value.toFixed(1));
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toFixed(1)}%`;
}

export function SpendVsActivity({
  lines,
  options,
  premiumPercent,
  lineIds,
}: {
  lines: BomLine[];
  options: CalcOptions;
  premiumPercent: number;
  lineIds: string[] | null;
}) {
  const candidates = lines.filter((l) => isCounted(l, options) && l.unitPriceEur != null && alternativesFor(l, catalogue).length > 0);
  const selected = lineIds ?? defaultComparisonLines(lines, catalogue, options);
  const switches = Object.fromEntries(
    selected
      .map((id) => [
        id,
        alternativesFor(
          lines.find((l) => l.id === id)!,
          catalogue,
        )[0]?.id,
      ])
      .filter(([, alt]) => alt),
  );
  const c = compareAccounting(lines, switches, premiumPercent, catalogue, spendData, options);
  const spendChange = change(c.spendBased.scopeBaseline, c.spendBased.scopeSwitched);
  const activityChange = change(c.activityBased.scopeBaseline, c.activityBased.scopeSwitched);

  if (candidates.length === 0) {
    return <p className="mt-6 text-zinc-500">No counted line has both a price and a sourced alternative.</p>;
  }

  return (
    <div className="mt-6 grid gap-6">
      <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">
        Buy the lower-carbon version of the selected lines at a price premium. A spend-based inventory only sees more money, so its number goes up. An
        activity-based one sees a different product, so its number goes down.
      </p>

      <label className="flex max-w-md flex-col gap-1 text-sm">
        <span>
          Price premium for the lower-carbon product: <strong className="tabular-nums">{premiumPercent}%</strong>
        </span>
        <input type="range" min={0} max={50} step={1} value={premiumPercent} onChange={(e) => actions.setPremium(Number(e.target.value))} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Spend-based</div>
          <div className="mt-1 text-4xl font-semibold tabular-nums text-red-600">{signed(spendChange)}</div>
          <div className="mt-1 text-sm text-zinc-500">
            {tonnes(c.spendBased.scopeBaseline)} → {tonnes(c.spendBased.scopeSwitched)} tCO₂e on the switched lines
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Activity-based</div>
          <div className="mt-1 text-4xl font-semibold tabular-nums text-emerald-600">{signed(activityChange)}</div>
          <div className="mt-1 text-sm text-zinc-500">
            {tonnes(c.activityBased.scopeBaseline)} → {tonnes(c.activityBased.scopeSwitched)} tCO₂e on the switched lines
          </div>
        </div>
      </div>

      <fieldset className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium">Lines to switch</legend>
        <div className="grid gap-1 text-sm">
          {candidates.map((line) => (
            <label key={line.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(line.id)}
                onChange={(e) => actions.setComparisonLines(e.target.checked ? [...selected, line.id] : selected.filter((id) => id !== line.id))}
              />
              {line.description}
              <span className="text-zinc-500">→ {alternativesFor(line, catalogue)[0].name}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
