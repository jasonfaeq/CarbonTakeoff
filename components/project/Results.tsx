"use client";

import { useState } from "react";
import { catalogue } from "@/lib/catalogue";
import { type BomLine, type Totals } from "@/lib/engine";
import { percent, tonnes } from "@/lib/format";
import { BarList } from "../charts/BarList";
import { Donut } from "../charts/Donut";
import { Treemap } from "../charts/Treemap";
import { EmptyState, Kpi, Swatch } from "../ui";

export function Results({ lines, totals }: { lines: BomLine[]; totals: Totals }) {
  const [group, setGroup] = useState<string | null>(null);
  if (totals.countedLines === 0) {
    return (
      <EmptyState icon="list" title="Nothing counted yet">
        Accept some lines in Review, or turn on auto-accept for high-confidence matches.
      </EmptyState>
    );
  }
  const byId = new Map(lines.map((l) => [l.id, l]));
  const groupOf = (factorId: string | null) => catalogue.byId.get(factorId ?? "")?.group ?? "Other";
  const proxyKg = totals.ranked.reduce((sum, r) => (catalogue.byId.get(r.factorId!)?.applicability === "proxy" ? sum + r.kgCO2e! : sum), 0);
  const t = (kg: number) => tonnes(kg);
  const tiles = totals.ranked
    .filter((r) => !group || groupOf(r.factorId) === group)
    .map((r) => ({
      id: r.lineId,
      label: byId.get(r.lineId)!.description,
      value: r.kgCO2e!,
      group: groupOf(r.factorId),
      detail: `${groupOf(r.factorId)} · ${catalogue.byId.get(r.factorId!)?.name}`,
    }));

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

      <section className="card p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="font-semibold">By material</h3>
          {group && (
            <button className="link text-xs text-ink-3" onClick={() => setGroup(null)}>
              Show all
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-col items-center gap-6 md:flex-row md:items-center">
          <Donut data={totals.byGroup.map((g) => ({ key: g.key, value: g.kgCO2e }))} format={t} unit="tCO₂e" selected={group} onSelect={setGroup} />
          <div className="w-full flex-1">
            <BarList data={totals.byGroup.map((g) => ({ key: g.key, value: g.kgCO2e }))} format={t} selected={group} onSelect={setGroup} />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="card p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold">Every counted line</h3>
            <span className="text-xs text-ink-3">Area is carbon. {group ? `Showing ${group}.` : "Click a material to filter."}</span>
          </div>
          <div className="mt-4">
            <Treemap data={tiles} format={(v) => `${tonnes(v)} t`} />
          </div>
        </section>

        <section className="card p-5">
          <h3 className="font-semibold">Top 5 hotspots</h3>
          <ol className="mt-4 grid gap-3 text-sm">
            {totals.ranked.slice(0, 5).map((r, i) => {
              const line = byId.get(r.lineId)!;
              const share = (r.kgCO2e! / totals.kgCO2e) * 100;
              return (
                <li key={r.lineId}>
                  <div className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-3">
                    <span className="num text-ink-3">{i + 1}</span>
                    <span className="flex min-w-0 items-center gap-2">
                      <Swatch group={groupOf(r.factorId)} />
                      <span className="truncate">{line.description}</span>
                    </span>
                    <span className="num">
                      {tonnes(r.kgCO2e!)} t <span className="text-ink-3">· {Math.round(share)}%</span>
                    </span>
                  </div>
                  <div className="meter mt-1.5 ml-8">
                    <span className="bg-ink-3" style={{ width: `${share}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
