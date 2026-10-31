"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { catalogue, transportModes } from "@/lib/catalogue";
import {
  buildInsights,
  computeScenario,
  computeTransportTotals,
  intensity,
  QUALITY_TIERS,
  qualitySummary,
  switchAll,
  type Insight,
} from "@/lib/engine";
import { percent, tonnes } from "@/lib/format";
import { BarList } from "../charts/BarList";
import { Donut } from "../charts/Donut";
import { Sankey } from "../charts/Sankey";
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
  const { project, totals, options, openLine } = useCurrentProject();
  const { lines } = project;
  const [group, setGroup] = useState<string | null>(null);
  const insights = useMemo(() => buildInsights(lines, totals, catalogue, options), [lines, totals, options]);
  const potential = useMemo(() => computeScenario(lines, switchAll(lines, catalogue, options), catalogue, options), [lines, options]);
  const quality = useMemo(() => qualitySummary(lines, totals, catalogue), [lines, totals]);
  const transport = useMemo(() => computeTransportTotals(lines, totals.results, transportModes), [lines, totals]);
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
  const decided = lines.length - totals.pendingLines;
  const perUnit = intensity(totals.kgCO2e, project.functionalUnit);
  const budget = project.budgetKgCO2e;
  const scenarios = project.scenarios.map((s) => ({ s, r: computeScenario(lines, s.switches, catalogue, options) }));
  const qualityTotal = quality.kgCO2e.good + quality.kgCO2e.fair + quality.kgCO2e.poor;
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
          detail={
            transport.kgCO2e > 0
              ? `${totals.countedLines} counted lines · +${tonnes(transport.kgCO2e)} t transport (A4)`
              : `${totals.countedLines} counted lines`
          }
        />
        {perUnit !== null && project.functionalUnit ? (
          <Kpi
            icon="target"
            label="Intensity"
            value={Math.round(perUnit).toLocaleString("en-GB")}
            unit={`kg CO₂e per ${project.functionalUnit.unit}`}
            detail={`Over ${project.functionalUnit.quantity.toLocaleString("en-GB")} ${project.functionalUnit.unit}`}
          />
        ) : (
          <Kpi
            icon="list"
            label="Review"
            value={`${decided}/${lines.length}`}
            unit="decided"
            detail={
              <Link href={`${base}/settings`} className="text-brand hover:underline">
                Set a functional unit to see intensity
              </Link>
            }
          />
        )}
        <Kpi
          icon="branch"
          label="Saving available"
          value={tonnes(potential.savingsKgCO2e)}
          unit="tCO₂e"
          detail={potential.savingsKgCO2e > 0 ? `${percent(potential.savingsPercent)} with sourced alternatives` : "No sourced alternative applies"}
        />
        <Kpi
          icon="gauge"
          label="Data quality"
          value={quality.grade}
          unit={`${Math.round(quality.score)} / 100`}
          detail={
            <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-surface-3" title="Good, fair and poor shares of the total">
              <span className="bg-good" style={{ width: `${(quality.kgCO2e.good / (qualityTotal || 1)) * 100}%` }} />
              <span className="bg-warn" style={{ width: `${(quality.kgCO2e.fair / (qualityTotal || 1)) * 100}%` }} />
              <span className="bg-bad" style={{ width: `${(quality.kgCO2e.poor / (qualityTotal || 1)) * 100}%` }} />
            </div>
          }
        />
      </div>

      {budget !== null && (
        <section className="card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Carbon budget</h3>
            <span className={`text-sm font-medium ${totals.kgCO2e > budget ? "text-bad" : "text-good"}`}>
              {totals.kgCO2e > budget ? `${tonnes(totals.kgCO2e - budget)} t over` : `${tonnes(budget - totals.kgCO2e)} t to spare`}
            </span>
          </div>
          <ul className="mt-4 grid gap-3 text-sm">
            {[
              { key: "baseline", name: "Counted total", kg: totals.kgCO2e },
              ...scenarios.map(({ s, r }) => ({ key: s.id, name: s.name, kg: r.scenario.kgCO2e })),
            ].map((row) => {
              const scale = Math.max(budget, totals.kgCO2e) * 1.05;
              return (
                <li key={row.key} className="grid grid-cols-[minmax(7rem,12rem)_1fr_6rem] items-center gap-3">
                  <span className="truncate text-ink-2">{row.name}</span>
                  <span className="relative h-3 rounded-full bg-surface-3">
                    <span
                      className={`absolute inset-y-0 left-0 rounded-full ${row.kg > budget ? "bg-bad" : "bg-brand"}`}
                      style={{ width: `${(row.kg / scale) * 100}%` }}
                    />
                    <span className="absolute -inset-y-1 w-0.5 bg-ink" style={{ left: `${(budget / scale) * 100}%` }} title="Budget" />
                  </span>
                  <span className="num text-right">{tonnes(row.kg)} t</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-ink-3">Budget {tonnes(budget)} tCO₂e, A1–A3. The black mark is the budget.</p>
        </section>
      )}

      {insights.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {insights.map((i) => (
            <InsightCard key={i.id} insight={i} base={base} />
          ))}
        </ul>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
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
          <h3 className="font-semibold">Top 5 hotspots</h3>
          <ol className="mt-4 grid gap-3.5 text-sm">
            {totals.ranked.slice(0, 5).map((r, i) => {
              const share = (r.kgCO2e! / totals.kgCO2e) * 100;
              return (
                <li key={r.lineId}>
                  <button
                    className="grid w-full grid-cols-[1.25rem_1fr_auto] items-center gap-3 text-left hover:text-brand"
                    onClick={() => openLine(r.lineId)}
                  >
                    <span className="num text-ink-3">{i + 1}</span>
                    <span className="flex min-w-0 items-center gap-2">
                      <Swatch group={groupOf(r.factorId)} />
                      <span className="truncate">{byId.get(r.lineId)!.description}</span>
                    </span>
                    <span className="num">
                      {tonnes(r.kgCO2e!)} t <span className="text-ink-3">· {Math.round(share)}%</span>
                    </span>
                  </button>
                  <div className="meter mt-1.5 ml-8">
                    <span className="bg-ink-3" style={{ width: `${share}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <section className="card p-5">
        <h3 className="font-semibold">How much of the total to trust</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {QUALITY_TIERS.map(({ tier, label, meaning }) => {
            const kg = quality.kgCO2e[tier];
            return (
              <div key={tier} className="rounded-xl border border-line p-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${tier === "good" ? "bg-good" : tier === "fair" ? "bg-warn" : "bg-bad"}`} />
                  <span className="text-sm font-medium">{label}</span>
                  <span className="num ml-auto text-sm">{percent(qualityTotal > 0 ? (kg / qualityTotal) * 100 : 0, 0)}</span>
                </div>
                <div className="num mt-2 text-lg font-semibold">{tonnes(kg)} t</div>
                <p className="mt-1 text-xs text-ink-3">{meaning}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">From section to material</h3>
          <span className="text-xs text-ink-3">Where in the bill of materials the carbon sits, and what it is made of</span>
        </div>
        <div className="mt-5">
          <Sankey
            links={totals.flows.map((f) => ({ source: f.section, target: f.group, value: f.kgCO2e }))}
            height={Math.max(220, Math.min(420, Math.max(totals.bySection.length, totals.byGroup.length) * 46))}
            format={(v) => `${tonnes(v)} t`}
          />
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">Every counted line</h3>
          <span className="text-xs text-ink-3">Area is carbon. {group ? `Showing ${group}.` : "Pick a material to filter."}</span>
        </div>
        <div className="mt-4">
          <Treemap data={tiles} height={360} format={(v) => `${tonnes(v)} t`} onSelect={openLine} />
        </div>
      </section>
      <ScreeningNote />
    </div>
  );
}
