"use client";

import type { ReactNode } from "react";
import { catalogue, spendData } from "@/lib/catalogue";
import { alternativesFor, computeLine, spendFactorFor, spendKgCO2e, type Factor } from "@/lib/engine";
import { factorValue, quantity, tonnes } from "@/lib/format";
import { actions, activeScenario } from "@/lib/store";
import { Drawer } from "../Drawer";
import { Icon } from "../Icon";
import { ConfidenceBadge, FactorBadges, SourceLink, StatusBadge, Swatch } from "../ui";
import { useCurrentProject } from "./context";
import { FactorSelect } from "./FactorSelect";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h3 className="eyebrow mb-2.5">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-1.5 text-sm">
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

function unitLabel(unit: string) {
  return unit.replace("CO2e", "CO₂e").replace("m3", "m³").replace("m2", "m²");
}

function Provenance({ factor }: { factor: Factor }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-4">
      <div className="flex items-start gap-2.5">
        <Swatch group={factor.group} size={14} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{factor.name}</div>
          <div className="num text-sm text-ink-2">
            {factorValue(factor.value)} {unitLabel(factor.unit)}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <FactorBadges factor={factor} />
        </div>
      </div>
      <dl className="mt-3 border-t border-line pt-2">
        <Row label="Source">
          <SourceLink factor={factor} />
          <div className="text-xs text-ink-3">{factor.sourceName}</div>
        </Row>
        <Row label="Table / row">{factor.tableRow}</Row>
        <Row label="Version">{factor.versionYear}</Row>
        <Row label="Scope">{factor.scope}</Row>
        <Row label="Licence">{factor.licence}</Row>
        <Row label="Retrieved">{factor.retrieved}</Row>
        {factor.densityKgM3 && (
          <Row label="Density">
            <span className="num">{factor.densityKgM3.toLocaleString("en-GB")} kg/m³</span>
            {factor.densitySource && <div className="text-xs text-ink-3">{factor.densitySource}</div>}
          </Row>
        )}
        <Row label="Factor id">
          <code className="font-mono text-xs">{factor.id}</code>
        </Row>
      </dl>
      {factor.note && <p className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn">{factor.note}</p>}
    </div>
  );
}

export function LineDrawer() {
  const { project, options, openLineId, openLine } = useCurrentProject();
  const line = project.lines.find((l) => l.id === openLineId);
  const close = () => openLine(null);
  const factor = line?.factorId ? catalogue.byId.get(line.factorId) : undefined;
  const result = line ? computeLine(line, catalogue, options) : null;
  const alts = line ? alternativesFor(line, catalogue) : [];
  const spendFactor = line ? spendFactorFor(line, spendData) : null;
  const eur = line?.unitPriceEur != null && line.quantity != null ? line.quantity * line.unitPriceEur : null;

  return (
    <Drawer
      open={Boolean(line)}
      onClose={close}
      title={line?.description ?? ""}
      subtitle={
        line && (
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge line={line} options={options} />
            {line.section && <span>{line.section}</span>}
            <span>
              · {line.source.file}, {line.source.ref}
            </span>
          </span>
        )
      }
      footer={
        line && (
          <div className="flex items-center gap-2">
            <button
              className="btn btn-primary"
              aria-pressed={line.status === "accepted"}
              onClick={() => actions.setStatus(project.id, [line.id], line.status === "accepted" ? "pending" : "accepted")}
            >
              <Icon name="check" size={15} /> {line.status === "accepted" ? "Accepted" : "Accept"}
            </button>
            <button
              className="btn"
              aria-pressed={line.status === "rejected"}
              onClick={() => actions.setStatus(project.id, [line.id], line.status === "rejected" ? "pending" : "rejected")}
            >
              <Icon name="x" size={15} /> {line.status === "rejected" ? "Rejected" : "Reject"}
            </button>
            {line.status !== "pending" && (
              <button className="btn btn-ghost ml-auto" onClick={() => actions.setStatus(project.id, [line.id], "pending")}>
                Back to pending
              </button>
            )}
          </div>
        )
      }
    >
      {line && result && (
        <>
          <div className="rounded-2xl bg-surface-2 p-5">
            <div className="eyebrow">A1–A3 for this line</div>
            {result.kgCO2e !== null ? (
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="num text-[34px] leading-none font-semibold tracking-tight">{tonnes(result.kgCO2e)}</span>
                <span className="text-sm text-ink-3">tCO₂e</span>
                {!result.counted && <span className="badge ml-2">Not counted yet</span>}
              </div>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-bad">
                <Icon name="alert" size={16} /> {result.error}
              </p>
            )}
            {factor && result.kgCO2e !== null && (
              <ol className="mt-4 grid gap-1.5 border-t border-line pt-3 font-mono text-[12.5px] text-ink-2">
                <li>
                  <span className="text-ink-3">quantity </span>
                  {quantity(line.quantity)} {line.unit}
                </li>
                <li>
                  <span className="text-ink-3">convert </span>
                  {result.conversion}
                </li>
                <li>
                  <span className="text-ink-3">× factor </span>
                  {factorValue(factor.value)} {unitLabel(factor.unit)}
                </li>
                <li className="text-ink">
                  <span className="text-ink-3">= </span>
                  {Math.round(result.kgCO2e).toLocaleString("en-GB")} kg CO₂e
                </li>
              </ol>
            )}
          </div>

          <Section title="Emission factor">
            <FactorSelect
              className="field"
              label={`Factor for ${line.description}`}
              value={line.factorId}
              onChange={(factorId) => actions.updateLine(project.id, line.id, { factorId, confidence: 1, matchReason: "Chosen by the reviewer" })}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
              <ConfidenceBadge confidence={line.confidence} />
              {line.matchReason}
            </div>
            {factor && (
              <div className="mt-3">
                <Provenance factor={factor} />
              </div>
            )}
          </Section>

          <Section title="Lower-carbon alternatives">
            {alts.length === 0 ? (
              <p className="text-sm text-ink-3">{factor ? "No lower factor from the same source." : "Pick a factor first."}</p>
            ) : (
              <ul className="grid gap-2">
                {alts.map((alt) => {
                  const after = computeLine({ ...line, factorId: alt.id }, catalogue, options).kgCO2e;
                  const saving = result.kgCO2e !== null && after !== null ? result.kgCO2e - after : null;
                  const chosen = activeScenario(project)?.switches[line.id] === alt.id;
                  return (
                    <li key={alt.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{alt.name}</div>
                        <div className="num text-xs text-ink-3">
                          {factorValue(alt.value)} {unitLabel(alt.unit)}
                          {saving !== null && <span className="text-good"> · saves {tonnes(saving)} t</span>}
                        </div>
                      </div>
                      <button
                        className="btn btn-sm"
                        aria-pressed={chosen}
                        onClick={() => actions.setSwitch(project.id, line.id, chosen ? null : alt.id)}
                      >
                        {chosen ? `In ${activeScenario(project)?.name}` : "Add to scenario"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="Spend-based view">
            {spendFactor && eur !== null ? (
              <dl>
                <Row label="Spend">
                  <span className="num">€{Math.round(eur).toLocaleString("en-GB")}</span>
                </Row>
                <Row label="Commodity">
                  {spendFactor.title} <span className="text-ink-3">(NAICS {spendFactor.naics})</span>
                </Row>
                <Row label="Estimate">
                  <span className="num">{tonnes(spendKgCO2e(eur, spendFactor, spendData))} tCO₂e</span>
                  <div className="text-xs text-ink-3">
                    €{Math.round(eur).toLocaleString("en-GB")} × {spendData.fx.usdPerEur} USD/EUR × {spendFactor.value} kg CO₂e/USD
                  </div>
                </Row>
              </dl>
            ) : (
              <p className="text-sm text-ink-3">{eur === null ? "No unit price on this line." : "No spend commodity for this factor."}</p>
            )}
          </Section>

          <Section title="Source">
            <dl>
              <Row label="File">{line.source.file}</Row>
              <Row label="Where">{line.source.ref}</Row>
            </dl>
            <pre className="mt-2 rounded-xl bg-surface-2 p-3 font-mono text-xs whitespace-pre-wrap text-ink-2">{line.source.snippet || "–"}</pre>
          </Section>
        </>
      )}
    </Drawer>
  );
}
