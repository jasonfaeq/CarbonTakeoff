"use client";

import { catalogue } from "@/lib/catalogue";
import { type BomLine, type Totals } from "@/lib/engine";
import { tonnes } from "@/lib/format";

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
      {detail && <div className="mt-1 text-sm text-zinc-500">{detail}</div>}
    </div>
  );
}

export function Results({ lines, totals }: { lines: BomLine[]; totals: Totals }) {
  if (totals.countedLines === 0) {
    return <p className="mt-6 text-zinc-500">No lines are counted yet. Accept some lines in Review.</p>;
  }
  const byId = new Map(lines.map((l) => [l.id, l]));
  const max = totals.byGroup[0]?.kgCO2e ?? 1;
  const proxyKg = totals.ranked.reduce((sum, r) => (catalogue.byId.get(r.factorId!)?.applicability === "proxy" ? sum + r.kgCO2e! : sum), 0);

  return (
    <div className="mt-6 grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Embodied carbon, A1–A3" value={`${tonnes(totals.kgCO2e)} t`} detail="tCO₂e, counted lines only" />
        <Tile
          label="Lines counted"
          value={`${totals.countedLines} of ${lines.length}`}
          detail={`${totals.pendingLines} need review, ${totals.rejectedLines} rejected`}
        />
        <Tile
          label="From proxy factors"
          value={`${((proxyKg / totals.kgCO2e) * 100).toFixed(0)}%`}
          detail="The closest factor, not the exact product"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="font-medium">By material</h3>
          <ul className="mt-3 grid gap-2">
            {totals.byGroup.map((g) => (
              <li key={g.key} className="grid grid-cols-[9rem_1fr_4rem] items-center gap-3 text-sm">
                <span className="truncate">{g.key}</span>
                <span className="h-3 rounded bg-zinc-200 dark:bg-zinc-800">
                  <span className="block h-3 rounded bg-emerald-600" style={{ width: `${(g.kgCO2e / max) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums">{tonnes(g.kgCO2e)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="font-medium">Top 5 hotspots</h3>
          <ol className="mt-3 grid gap-2 text-sm">
            {totals.ranked.slice(0, 5).map((r, i) => {
              const line = byId.get(r.lineId)!;
              return (
                <li key={r.lineId} className="flex items-baseline gap-3">
                  <span className="w-4 text-zinc-400">{i + 1}</span>
                  <span className="flex-1 truncate">{line.description}</span>
                  <span className="tabular-nums">{tonnes(r.kgCO2e!)} t</span>
                  <span className="w-12 text-right tabular-nums text-zinc-500">{((r.kgCO2e! / totals.kgCO2e) * 100).toFixed(0)}%</span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
