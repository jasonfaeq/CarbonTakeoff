"use client";

import { catalogue, spendData } from "@/lib/catalogue";
import { alternativesFor, compareAccounting, defaultComparisonLines, isCounted, type BomLine, type CalcOptions } from "@/lib/engine";
import { tonnes } from "@/lib/format";
import { actions } from "@/lib/store";
import { Icon } from "./Icon";
import { EmptyState } from "./ui";

function change(before: number, after: number) {
  if (before === 0) return 0;
  return ((after - before) / before) * 100;
}

function signed(value: number) {
  const r = Number(value.toFixed(1));
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toFixed(1)}%`;
}

function Side({
  title,
  method,
  before,
  after,
  pct,
  tone,
}: {
  title: string;
  method: string;
  before: number;
  after: number;
  pct: number;
  tone: "bad" | "good";
}) {
  const max = Math.max(before, after) || 1;
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{title}</span>
        <span className={`badge`} data-tone={tone}>
          <Icon name={pct > 0 ? "arrow-up-right" : "arrow-right"} size={12} className={pct < 0 ? "rotate-45" : ""} />
          {pct > 0 ? "Looks worse" : "Looks better"}
        </span>
      </div>
      <div className={`num mt-4 text-[52px] leading-none font-semibold tracking-tight ${tone === "bad" ? "text-bad" : "text-good"}`}>
        {signed(pct)}
      </div>
      <p className="mt-2 text-sm text-ink-2">{method}</p>
      <div className="mt-6 grid gap-2.5 text-sm">
        {[
          ["Conventional", before],
          ["Lower-carbon", after],
        ].map(([label, value]) => (
          <div key={label as string} className="grid grid-cols-[6.5rem_1fr_5rem] items-center gap-3">
            <span className="text-ink-3">{label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-surface-3">
              <span
                className={`block h-full rounded-full ${label === "Conventional" ? "bg-ink-3" : tone === "bad" ? "bg-bad" : "bg-good"}`}
                style={{ width: `${((value as number) / max) * 100}%` }}
              />
            </span>
            <span className="num text-right">{tonnes(value as number)} t</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SpendVsActivity({
  projectId,
  lines,
  options,
  premiumPercent,
  lineIds,
}: {
  projectId: string;
  lines: BomLine[];
  options: CalcOptions;
  premiumPercent: number;
  lineIds: string[] | null;
}) {
  const candidates = lines.filter((l) => isCounted(l, options) && l.unitPriceEur != null && alternativesFor(l, catalogue).length > 0);
  const selected = lineIds ?? defaultComparisonLines(lines, catalogue, options);
  const switches = Object.fromEntries(
    selected.map((id) => [id, alternativesFor(lines.find((l) => l.id === id) ?? { factorId: null }, catalogue)[0]?.id]).filter(([, alt]) => alt),
  );
  const c = compareAccounting(lines, switches, premiumPercent, catalogue, spendData, options);

  if (candidates.length === 0) {
    return (
      <EmptyState icon="scale" title="No line to compare">
        The comparison needs counted lines with a unit price and a sourced lower-carbon alternative.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="card flex flex-wrap items-center gap-x-8 gap-y-4 p-5">
        <div className="max-w-xl">
          <h3 className="font-semibold">The same purchase, counted two ways</h3>
          <p className="mt-1 text-sm text-ink-2">
            Buy the lower-carbon version of the selected lines at a premium. Spend-based accounting only sees more money. Activity-based accounting
            sees a different product.
          </p>
        </div>
        <label className="ml-auto grid min-w-64 gap-2 text-sm">
          <span className="flex justify-between">
            <span className="text-ink-2">Price premium</span>
            <strong className="num">{premiumPercent}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={premiumPercent}
            className="accent-[var(--brand)]"
            onChange={(e) => actions.setPremium(projectId, Number(e.target.value))}
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Side
          title="Spend-based"
          method="EUR × kg CO₂e per USD, by commodity"
          before={c.spendBased.scopeBaseline}
          after={c.spendBased.scopeSwitched}
          pct={change(c.spendBased.scopeBaseline, c.spendBased.scopeSwitched)}
          tone="bad"
        />
        <Side
          title="Activity-based"
          method="Quantity × product factor"
          before={c.activityBased.scopeBaseline}
          after={c.activityBased.scopeSwitched}
          pct={change(c.activityBased.scopeBaseline, c.activityBased.scopeSwitched)}
          tone="good"
        />
      </div>

      <fieldset className="card p-5">
        <legend className="sr-only">Lines to switch</legend>
        <h3 className="font-semibold">Lines to switch</h3>
        <div className="mt-3 grid gap-2 text-sm">
          {candidates.map((line) => (
            <label key={line.id} className="flex items-center gap-2.5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--brand)]"
                checked={selected.includes(line.id)}
                onChange={(e) =>
                  actions.setComparisonLines(projectId, e.target.checked ? [...selected, line.id] : selected.filter((id) => id !== line.id))
                }
              />
              <span>{line.description}</span>
              <Icon name="arrow-right" size={13} className="text-ink-3" />
              <span className="text-ink-3">{alternativesFor(line, catalogue)[0].name}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
