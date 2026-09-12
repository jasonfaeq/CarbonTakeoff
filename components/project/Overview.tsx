"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { catalogue } from "@/lib/catalogue";
import { buildInsights, computeScenario, switchAll, type Insight } from "@/lib/engine";
import { percent, tonnes } from "@/lib/format";
import { BarList } from "../charts/BarList";
import { Donut } from "../charts/Donut";
import { Treemap } from "../charts/Treemap";
import { Icon, type IconName } from "../Icon";
import { EmptyState, Kpi, ScreeningNote, Swatch } from "../ui";
import { useCurrentProject } from "./context";

const INSIGHT_ICON: Record<Insight["tone"], IconName> = { info: "info", good: "leaf", warn: "alert", bad: "alert" };
const INSIGHT_TONE: Record<Insight["tone"], string> = {
  info: "bg-info-soft text-info",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
};

function InsightCard({ insight, base }: { insight: Insight; base: string }) {
  return (
    <li className="card flex gap-3.5 p-4">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${INSIGHT_TONE[insight.tone]}`}>
        <Icon name={INSIGHT_ICON[insight.tone]} size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{insight.title}</p>
        <p className="mt-0.5 text-[13px] text-ink-2">{insight.body}</p>
        {insight.action && (
          <Link href={base + insight.action.href} className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
            {insight.action.label} <Icon name="arrow-right" size={13} />
          </Link>
        )}
      </div>
    </li>
  );
}

export function Overview() {
  const { project, totals, options } = useCurrentProject();
  const { lines } = project;
  const [group, setGroup] = useState<string | null>(null);
  const insights = useMemo(() => buildInsights(lines, totals, catalogue, options), [lines, totals, options]);
  const potential = useMemo(() => computeScenario(lines, switchAll(lines, catalogue, options), catalogue, options), [lines, options]);
  const base = `/project/${project.id}`;

  if (totals.countedLines === 0) {
    return (
      <div className="grid gap-5">
        {insights.length > 0 && (
          <ul className="grid gap-3 md:grid-cols-2">
            {insights.map((i) => (
              <InsightCard key={i.id} insight={i} base={base} />
            ))}
          </ul>
        )}
        <EmptyState
          icon="list"
          title="Nothing counted yet"
          action={
            <Link href={`${base}/lines`} className="btn btn-primary">
              Review lines
            </Link>
          }
        >
          Accept some lines in Lines, or turn on auto-accept for high-confidence matches.
        </EmptyState>
      </div>
    );
  }

  const byId = new Map(lines.map((l) => [l.id, l]));
  const groupOf = (factorId: string | null) => catalogue.byId.get(factorId ?? "")?.group ?? "Other";
  const proxyKg = totals.ranked.reduce((sum, r) => (catalogue.byId.get(r.factorId!)?.applicability === "proxy" ? sum + r.kgCO2e! : sum), 0);
  const decided = lines.length - totals.pendingLines;
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          accent
          icon="leaf"
          label="Embodied carbon, A1–A3"
          value={tonnes(totals.kgCO2e)}
          unit="tCO₂e"
          detail={`${totals.countedLines} counted lines`}
        />
        <Kpi
          icon="list"
          label="Review"
          value={`${decided}/${lines.length}`}
          unit="decided"
          detail={
            <div className="meter mt-1">
              <span className="bg-brand" style={{ width: `${(decided / lines.length) * 100}%` }} />
            </div>
          }
        />
        <Kpi
          icon="branch"
          label="Saving available"
          value={tonnes(potential.savingsKgCO2e)}
          unit="tCO₂e"
          detail={potential.savingsKgCO2e > 0 ? `${percent(potential.savingsPercent)} with sourced alternatives` : "No sourced alternative applies"}
        />
        <Kpi
          icon="alert"
          label="From proxy factors"
          value={percent((proxyKg / totals.kgCO2e) * 100)}
          detail="Closest factor, not the exact product"
        />
      </div>

      {insights.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {insights.map((i) => (
            <InsightCard key={i.id} insight={i} base={base} />
          ))}
        </ul>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="card p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold">By material</h3>
            {group && (
              <button className="link text-xs text-ink-3" onClick={() => setGroup(null)}>
                Show all
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-col items-center gap-6 md:flex-row">
            <Donut
              data={totals.byGroup.map((g) => ({ key: g.key, value: g.kgCO2e }))}
              format={tonnes}
              unit="tCO₂e"
              selected={group}
              onSelect={setGroup}
            />
            <div className="w-full min-w-0 flex-1">
              <BarList data={totals.byGroup.map((g) => ({ key: g.key, value: g.kgCO2e }))} format={tonnes} selected={group} onSelect={setGroup} />
            </div>
          </div>
        </section>

        <section className="card p-5">
          <h3 className="font-semibold">By section</h3>
          <p className="text-xs text-ink-3">The sections of the bill of materials</p>
          <div className="mt-4">
            <BarList
              data={totals.bySection.map((s) => ({ key: s.key, value: s.kgCO2e, color: "var(--brand)", detail: `${s.lines} lines` }))}
              format={tonnes}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Every counted line</h3>
            <span className="text-xs text-ink-3">Area is carbon. {group ? `Showing ${group}.` : "Pick a material to filter."}</span>
          </div>
          <div className="mt-4">
            <Treemap data={tiles} format={(v) => `${tonnes(v)} t`} />
          </div>
        </section>

        <section className="card p-5">
          <h3 className="font-semibold">Top 5 hotspots</h3>
          <ol className="mt-4 grid gap-3.5 text-sm">
            {totals.ranked.slice(0, 5).map((r, i) => {
              const share = (r.kgCO2e! / totals.kgCO2e) * 100;
              return (
                <li key={r.lineId}>
                  <div className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-3">
                    <span className="num text-ink-3">{i + 1}</span>
                    <span className="flex min-w-0 items-center gap-2">
                      <Swatch group={groupOf(r.factorId)} />
                      <span className="truncate">{byId.get(r.lineId)!.description}</span>
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
      <ScreeningNote />
    </div>
  );
}
