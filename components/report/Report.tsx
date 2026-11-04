"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { catalogue, spendData, transportModes, usingPlaceholderFactors } from "@/lib/catalogue";
import {
  compareAccounting,
  computeScenario,
  intensity,
  qualitySummary,
  computeTotals,
  computeTransportTotals,
  defaultComparisonLines,
  alternativesFor,
  type Factor,
} from "@/lib/engine";
import { factorValue, percent, quantity, tonnes } from "@/lib/format";
import type { Project } from "@/lib/store";
import { BarList } from "../charts/BarList";
import { Donut } from "../charts/Donut";
import { Sankey } from "../charts/Sankey";
import { Icon } from "../Icon";
import { FactorBadges, Logo, SCREENING_NOTE, Swatch } from "../ui";

function H2({ n, children }: { n: number; children: ReactNode }) {
  return (
    <h2 className="flex items-baseline gap-3 border-b border-ink pb-2 text-xl font-semibold tracking-tight">
      <span className="num text-sm text-ink-3">{String(n).padStart(2, "0")}</span>
      {children}
    </h2>
  );
}

function Figure({ label, value, unit, detail }: { label: string; value: string; unit?: string; detail?: string }) {
  return (
    <div className="border-l-2 border-line-2 pl-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="num text-3xl font-semibold tracking-tight">{value}</span>
        {unit && <span className="text-sm text-ink-3">{unit}</span>}
      </div>
      {detail && <div className="mt-0.5 text-xs text-ink-3">{detail}</div>}
    </div>
  );
}

export function Report({ project }: { project: Project }) {
  const options = { autoAcceptHigh: project.autoAcceptHigh };
  const totals = computeTotals(project.lines, catalogue, options);
  const transport = computeTransportTotals(project.lines, totals.results, transportModes);
  const byId = new Map(project.lines.map((l) => [l.id, l]));
  const groupOf = (factorId: string | null) => catalogue.byId.get(factorId ?? "")?.group ?? "Other";
  const proxyKg = totals.ranked.reduce((s, r) => (catalogue.byId.get(r.factorId!)?.applicability === "proxy" ? s + r.kgCO2e! : s), 0);
  const scenarios = project.scenarios.map((s) => ({ s, r: computeScenario(project.lines, s.switches, catalogue, options) }));
  const comparisonIds = project.comparisonLineIds ?? defaultComparisonLines(project.lines, catalogue, options);
  const comparisonSwitches = Object.fromEntries(
    comparisonIds.map((id) => [id, alternativesFor(byId.get(id) ?? { factorId: null }, catalogue)[0]?.id]).filter(([, alt]) => alt),
  );
  const spend = compareAccounting(project.lines, comparisonSwitches, project.premiumPercent, catalogue, spendData, options);
  const quality = qualitySummary(project.lines, totals, catalogue);
  const perUnit = intensity(totals.kgCO2e, project.functionalUnit);
  const usedFactors = [...new Set(totals.ranked.map((r) => r.factorId!))].map((id) => catalogue.byId.get(id)!).filter(Boolean) as Factor[];
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const change = (a: number, b: number) => (a > 0 ? ((b - a) / a) * 100 : 0);
  let section = 0;
  const next = () => ++section;

  return (
    <div className="report mx-auto w-full max-w-[860px] px-4 pt-6 pb-20 sm:px-8">
      <div className="no-print mb-6 flex flex-wrap items-center gap-2">
        <Link href={`/project/${project.id}`} className="btn btn-ghost btn-sm">
          <Icon name="arrow-left" size={14} /> Back to the project
        </Link>
        <button className="btn btn-primary btn-sm ml-auto" onClick={() => window.print()}>
          <Icon name="printer" size={14} /> Print or save as PDF
        </button>
      </div>

      <article className="card p-8 sm:p-12 print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-line pb-8">
          <div>
            <p className="eyebrow">Embodied-carbon screening report</p>
            <h1 className="mt-3 text-[34px] leading-tight font-semibold tracking-tight">{project.name}</h1>
            <p className="mt-2 text-sm text-ink-2">
              {project.document?.file} · {date}
            </p>
          </div>
          <Logo size={36} />
        </header>

        {usingPlaceholderFactors && (
          <p className="mt-6 rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn">
            Built on placeholder factors. Every number in this report is synthetic and must not be used.
          </p>
        )}

        <section className="mt-8 grid gap-6 sm:grid-cols-3">
          <Figure
            label="A1–A3"
            value={tonnes(totals.kgCO2e)}
            unit="tCO₂e"
            detail={`${totals.countedLines} of ${project.lines.length} lines counted`}
          />
          <Figure label="Transport, A4" value={tonnes(transport.kgCO2e)} unit="tCO₂e" detail={`${transport.unset} counted lines without a leg`} />
          <Figure
            label="From proxy factors"
            value={totals.kgCO2e > 0 ? percent((proxyKg / totals.kgCO2e) * 100) : "–"}
            detail="Closest factor, not the product"
          />
          {perUnit !== null && project.functionalUnit && (
            <Figure
              label="Intensity"
              value={Math.round(perUnit).toLocaleString("en-GB")}
              unit={`kg CO₂e per ${project.functionalUnit.unit}`}
              detail={`Over ${project.functionalUnit.quantity.toLocaleString("en-GB")} ${project.functionalUnit.unit}`}
            />
          )}
          <Figure
            label="Data quality"
            value={quality.grade}
            unit={`${Math.round(quality.score)} / 100`}
            detail="Good factors count fully, fair ones half"
          />
        </section>
        <p className="mt-6 text-sm text-ink-2">
          {SCREENING_NOTE} Lines count only once a reviewer accepts them{project.autoAcceptHigh ? ", or when they match with high confidence" : ""}.{" "}
          {totals.pendingLines > 0 && <strong>{totals.pendingLines} lines were still awaiting review when this report was made.</strong>}
        </p>

        <section className="mt-12 break-inside-avoid">
          <H2 n={next()}>Where the carbon is</H2>
          <div className="mt-6 flex flex-col items-center gap-8 sm:flex-row">
            <Donut data={totals.byGroup.map((g) => ({ key: g.key, value: g.kgCO2e }))} size={190} thickness={26} format={tonnes} unit="tCO₂e" />
            <div className="w-full min-w-0 flex-1">
              <BarList data={totals.byGroup.map((g) => ({ key: g.key, value: g.kgCO2e }))} format={tonnes} />
            </div>
          </div>
          {totals.flows.length > 1 && (
            <div className="mt-8">
              <Sankey
                links={totals.flows.map((f) => ({ source: f.section, target: f.group, value: f.kgCO2e }))}
                height={260}
                format={(v) => `${tonnes(v)} t`}
              />
            </div>
          )}
        </section>

        <section className="mt-12 break-inside-avoid">
          <H2 n={next()}>Hotspots</H2>
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs text-ink-3">
              <tr className="border-b border-line">
                <th className="py-2 font-medium">#</th>
                <th className="py-2 font-medium">Line</th>
                <th className="py-2 font-medium">Factor</th>
                <th className="py-2 text-right font-medium">tCO₂e</th>
                <th className="py-2 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {totals.ranked.slice(0, 10).map((r, i) => (
                <tr key={r.lineId} className="border-b border-line align-top">
                  <td className="num py-2 text-ink-3">{i + 1}</td>
                  <td className="py-2">
                    <span className="flex items-center gap-2">
                      <Swatch group={groupOf(r.factorId)} />
                      {byId.get(r.lineId)?.description}
                    </span>
                  </td>
                  <td className="py-2 text-ink-2">{catalogue.byId.get(r.factorId!)?.name}</td>
                  <td className="num py-2 text-right">{tonnes(r.kgCO2e!)}</td>
                  <td className="num py-2 text-right text-ink-3">{percent((r.kgCO2e! / totals.kgCO2e) * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {scenarios.length > 0 && (
          <section className="mt-12 break-inside-avoid">
            <H2 n={next()}>Scenarios</H2>
            <p className="mt-3 text-sm text-ink-2">
              Each scenario switches counted lines to a lower factor from the same source as their baseline factor.
            </p>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs text-ink-3">
                <tr className="border-b border-line">
                  <th className="py-2 font-medium">Scenario</th>
                  <th className="py-2 text-right font-medium">Lines switched</th>
                  <th className="py-2 text-right font-medium">tCO₂e</th>
                  <th className="py-2 text-right font-medium">Saving</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line">
                  <td className="py-2">Baseline</td>
                  <td className="num py-2 text-right">–</td>
                  <td className="num py-2 text-right">{tonnes(totals.kgCO2e)}</td>
                  <td className="num py-2 text-right">–</td>
                </tr>
                {scenarios.map(({ s, r }) => (
                  <tr key={s.id} className="border-b border-line">
                    <td className="py-2">{s.name}</td>
                    <td className="num py-2 text-right">{r.lines.length}</td>
                    <td className="num py-2 text-right">{tonnes(r.scenario.kgCO2e)}</td>
                    <td className="num py-2 text-right">
                      {tonnes(r.savingsKgCO2e)} t ({percent(r.savingsPercent)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {spend.switchedLineIds.length > 0 && (
          <section className="mt-12 break-inside-avoid">
            <H2 n={next()}>Spend-based against activity-based</H2>
            <p className="mt-3 text-sm text-ink-2">
              Buying the lower-carbon version of {spend.switchedLineIds.length} {spend.switchedLineIds.length === 1 ? "line" : "lines"} at a{" "}
              {project.premiumPercent}% premium: the spend-based estimate for those lines moves{" "}
              <strong>{percent(change(spend.spendBased.scopeBaseline, spend.spendBased.scopeSwitched))}</strong>, the activity-based estimate{" "}
              <strong>{percent(change(spend.activityBased.scopeBaseline, spend.activityBased.scopeSwitched))}</strong>. A spend-based inventory cannot
              see a lower-carbon purchase; it only sees the higher price.
            </p>
          </section>
        )}

        <section className="mt-12">
          <H2 n={next()}>Factors used</H2>
          <ul className="mt-4 grid gap-3 text-sm">
            {usedFactors.map((f) => (
              <li key={f.id} className="break-inside-avoid border-b border-line pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Swatch group={f.group} />
                  <span className="font-medium">{f.name}</span>
                  <span className="num text-ink-2">
                    {factorValue(f.value)} {f.unit.replace("CO2e", "CO₂e")}
                  </span>
                  <FactorBadges factor={f} />
                </div>
                <div className="mt-1 text-xs text-ink-3">
                  {f.sourceName}. {f.tableRow}. {f.versionYear}. {f.licence}. Retrieved {f.retrieved}.{f.url && <> {f.url}</>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 print:break-before-page">
          <H2 n={next()}>Every line</H2>
          <table className="mt-4 w-full text-[12.5px]">
            <thead className="text-left text-xs text-ink-3">
              <tr className="border-b border-line">
                <th className="py-2 pr-2 font-medium">Line</th>
                <th className="py-2 pr-2 text-right font-medium">Quantity</th>
                <th className="py-2 pr-2 font-medium">Working</th>
                <th className="py-2 pr-2 font-medium">Status</th>
                <th className="py-2 text-right font-medium">tCO₂e</th>
              </tr>
            </thead>
            <tbody>
              {project.lines.map((line, i) => {
                const r = totals.results[i];
                return (
                  <tr key={line.id} className="break-inside-avoid border-b border-line align-top">
                    <td className="py-1.5 pr-2">
                      {line.description}
                      <div className="text-[11px] text-ink-3">
                        {line.source.file}, {line.source.ref}
                      </div>
                    </td>
                    <td className="num py-1.5 pr-2 text-right whitespace-nowrap">
                      {quantity(line.quantity)} {line.unit}
                    </td>
                    <td className="py-1.5 pr-2 text-ink-2">
                      {r.error ? <span className="text-bad">{r.error}</span> : `${r.conversion} × ${catalogue.byId.get(line.factorId!)?.name}`}
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap text-ink-2">
                      {line.status === "pending" ? (r.counted ? "auto-accepted" : "not reviewed") : line.status}
                    </td>
                    <td className="num py-1.5 text-right">{r.counted && r.kgCO2e !== null ? tonnes(r.kgCO2e) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <footer className="mt-12 border-t border-line pt-4 text-xs text-ink-3">
          Made with Carbon Takeoff on {date}. {SCREENING_NOTE} Figures are rounded to 0.1 t.
        </footer>
      </article>
    </div>
  );
}
