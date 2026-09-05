"use client";

import { catalogue } from "@/lib/catalogue";
import { type BomLine, type Totals } from "@/lib/engine";
import { percent, tonnes } from "@/lib/format";
import { groupStyle } from "@/lib/groups";
import { EmptyState, Kpi, Swatch } from "../ui";

export function Results({ lines, totals }: { lines: BomLine[]; totals: Totals }) {
  if (totals.countedLines === 0) {
    return (
      <EmptyState icon="list" title="Nothing counted yet">
        Accept some lines in Review, or turn on auto-accept for high-confidence matches.
      </EmptyState>
    );
  }
  const byId = new Map(lines.map((l) => [l.id, l]));
  const max = totals.byGroup[0]?.kgCO2e ?? 1;
  const proxyKg = totals.ranked.reduce((sum, r) => (catalogue.byId.get(r.factorId!)?.applicability === "proxy" ? sum + r.kgCO2e! : sum), 0);

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi accent icon="leaf" label="Embodied carbon, A1–A3" value={tonnes(totals.kgCO2e)} unit="tCO₂e" detail="Counted lines only" />
        <Kpi
          icon="list"
          label="Lines counted"
          value={`${totals.countedLines}/${lines.length}`}
          detail={`${totals.pendingLines} need review · ${totals.rejectedLines} rejected`}
        />
        <Kpi
          icon="alert"
          label="From proxy factors"
          value={percent((proxyKg / totals.kgCO2e) * 100)}
          detail="The closest factor, not the exact product"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="font-semibold">By material</h3>
          <ul className="mt-4 grid gap-3">
            {totals.byGroup.map((g) => (
              <li key={g.key} className="grid grid-cols-[minmax(7rem,10rem)_1fr_auto] items-center gap-3 text-sm">
                <span className="flex items-center gap-2 truncate">
                  <Swatch group={g.key} />
                  {g.key}
                </span>
                <span className="h-2.5 overflow-hidden rounded-full bg-surface-3">
                  <span className="block h-full rounded-full" style={{ width: `${(g.kgCO2e / max) * 100}%`, background: groupStyle(g.key).color }} />
                </span>
                <span className="num w-28 text-right">
                  {tonnes(g.kgCO2e)} <span className="text-ink-3">· {Math.round((g.kgCO2e / totals.kgCO2e) * 100)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h3 className="font-semibold">Top 5 hotspots</h3>
          <ol className="mt-4 grid gap-3 text-sm">
            {totals.ranked.slice(0, 5).map((r, i) => {
              const line = byId.get(r.lineId)!;
              const group = catalogue.byId.get(r.factorId!)?.group;
              return (
                <li key={r.lineId} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-3">
                  <span className="num text-ink-3">{i + 1}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <Swatch group={group} />
                    <span className="truncate">{line.description}</span>
                  </span>
                  <span className="num">
                    {tonnes(r.kgCO2e!)} t <span className="text-ink-3">· {Math.round((r.kgCO2e! / totals.kgCO2e) * 100)}%</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
