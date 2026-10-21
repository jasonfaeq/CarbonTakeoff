"use client";

import { useMemo, useState } from "react";
import { catalogue, spendData, transportModes } from "@/lib/catalogue";
import type { Factor } from "@/lib/engine";
import { factorValue } from "@/lib/format";
import { GROUP_ORDER } from "@/lib/groups";
import { useProjects } from "@/lib/store";
import { Icon } from "../Icon";
import { Badge, FactorBadges, SourceLink, Swatch } from "../ui";

type Tab = "materials" | "transport" | "spend";

function unitLabel(unit: string) {
  return unit.replace("CO2e", "CO₂e").replace("m3", "m³").replace("m2", "m²");
}

function Detail({ factor }: { factor: Factor }) {
  const rows: [string, string | undefined][] = [
    ["Source", factor.sourceName],
    ["Table / row", factor.tableRow],
    ["Version", factor.versionYear],
    ["Scope", factor.scope],
    ["Licence", factor.licence],
    ["Retrieved", factor.retrieved],
    ["Density", factor.densityKgM3 ? `${factor.densityKgM3.toLocaleString("en-GB")} kg/m³ (${factor.densitySource})` : undefined],
    ["Mass per unit", factor.kgPerDeclaredUnit ? `${factor.kgPerDeclaredUnit} kg/${factor.declaredUnit}` : undefined],
    ["Id", factor.id],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-[8rem_1fr]">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-3">{k}</dt>
            <dd className={k === "Id" ? "font-mono text-xs" : ""}>{v}</dd>
          </div>
        ))}
    </dl>
  );
}

export function FactorLibrary() {
  const projects = useProjects();
  const [tab, setTab] = useState<Tab>("materials");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [proxyOnly, setProxyOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const usage = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of projects) for (const l of p.lines) if (l.factorId) count.set(l.factorId, (count.get(l.factorId) ?? 0) + 1);
    return count;
  }, [projects]);

  const groups = GROUP_ORDER.filter((g) => catalogue.factors.some((f) => f.group === g));
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = catalogue.factors
    .filter((f) => !group || f.group === group)
    .filter((f) => !proxyOnly || f.applicability === "proxy")
    .filter((f) => words.every((w) => `${f.name} ${f.group} ${f.id} ${f.source} ${f.note ?? ""}`.toLowerCase().includes(w)))
    .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.name.localeCompare(b.name));
  const sources = [...new Set(catalogue.factors.map((f) => f.source))];

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pt-10 pb-16 sm:px-6">
      <p className="eyebrow">Factor library</p>
      <h1 className="mt-2 text-[30px] font-semibold tracking-tight">Every factor the app can use</h1>
      <p className="mt-1 max-w-3xl text-ink-2">
        {catalogue.factors.length} material factors from {sources.join(", ")}, {transportModes.length} freight factors and {spendData.factors.length}{" "}
        spend factors. Each carries the table and row it came from, so any number in a project can be checked against the source.
      </p>

      <div className="seg mt-6" role="group" aria-label="Factor type">
        {(
          [
            ["materials", "Materials"],
            ["transport", "Transport"],
            ["spend", "Spend"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "materials" && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="relative min-w-60 flex-1 sm:max-w-80">
              <span className="sr-only">Search factors</span>
              <Icon name="search" size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
              <input className="field !pl-9" type="search" placeholder="Search factors" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={proxyOnly} onChange={(e) => setProxyOnly(e.target.checked)} />
              Proxies only
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Material group">
            <button className="chip" aria-pressed={group === null} onClick={() => setGroup(null)}>
              All <span className="count">{catalogue.factors.length}</span>
            </button>
            {groups.map((g) => (
              <button key={g} className="chip" aria-pressed={group === g} onClick={() => setGroup(group === g ? null : g)}>
                <Swatch group={g} size={10} /> {g} <span className="count">{catalogue.factors.filter((f) => f.group === g).length}</span>
              </button>
            ))}
          </div>

          <div className="card mt-4 overflow-x-auto">
            <table className="data-table min-w-[860px]">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th className="right w-40">Value</th>
                  <th className="w-44">Source</th>
                  <th>Lower alternatives</th>
                  <th className="right w-28">Used in lines</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((f) => {
                  const expanded = open === f.id;
                  return (
                    <FactorRow
                      key={f.id}
                      factor={f}
                      expanded={expanded}
                      used={usage.get(f.id) ?? 0}
                      onToggle={() => setOpen(expanded ? null : f.id)}
                      onJump={(id) => {
                        setGroup(null);
                        setQuery("");
                        setOpen(id);
                        requestAnimationFrame(() => document.getElementById(`factor-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
                      }}
                    />
                  );
                })}
              </tbody>
            </table>
            {shown.length === 0 && <p className="px-5 py-10 text-center text-sm text-ink-3">No factor matches.</p>}
          </div>
        </>
      )}

      {tab === "transport" && (
        <div className="card mt-5 overflow-x-auto">
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th>Mode</th>
                <th className="right w-48">Value</th>
                <th>Source</th>
                <th>Also written as</th>
              </tr>
            </thead>
            <tbody>
              {transportModes.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium">
                    {m.name}
                    {m.status === "PLACEHOLDER" && (
                      <Badge tone="outline" className="ml-2">
                        Placeholder
                      </Badge>
                    )}
                  </td>
                  <td className="right num">
                    {factorValue(m.value)} {unitLabel(m.unit)}
                  </td>
                  <td className="text-ink-2">
                    {m.sourceName}
                    <div className="text-xs text-ink-3">
                      {m.tableRow} · {m.versionYear}
                    </div>
                  </td>
                  <td className="text-xs text-ink-3">{m.aliases.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "spend" && (
        <div className="mt-5 grid gap-4">
          <p className="max-w-3xl text-sm text-ink-2">
            {spendData.source.sourceName}. {spendData.source.tableRow}. {spendData.source.versionYear}. Euros are converted at{" "}
            {spendData.fx.usdPerEur} USD per EUR ({spendData.fx.sourceName}).
          </p>
          <div className="card overflow-x-auto">
            <table className="data-table min-w-[640px]">
              <thead>
                <tr>
                  <th className="w-28">NAICS</th>
                  <th>Commodity</th>
                  <th className="right w-44">kg CO₂e per USD</th>
                  <th className="right w-40">Activity factors mapped</th>
                </tr>
              </thead>
              <tbody>
                {spendData.factors.map((f) => (
                  <tr key={f.naics}>
                    <td className="num">{f.naics}</td>
                    <td>{f.title}</td>
                    <td className="right num">{factorValue(f.value)}</td>
                    <td className="right num text-ink-3">{Object.values(spendData.factorToNaics).filter((n) => n === f.naics).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

function FactorRow({
  factor: f,
  expanded,
  used,
  onToggle,
  onJump,
}: {
  factor: Factor;
  expanded: boolean;
  used: number;
  onToggle: () => void;
  onJump: (id: string) => void;
}) {
  const alts = f.alternatives.map((id) => catalogue.byId.get(id)).filter((a): a is Factor => Boolean(a));
  return (
    <>
      <tr id={`factor-${f.id}`} className={expanded ? "[&>td]:bg-surface-2/60" : ""}>
        <td>
          <button className="flex w-full items-start gap-2.5 text-left" aria-expanded={expanded} onClick={onToggle}>
            <Swatch group={f.group} size={14} className="mt-0.5" />
            <span className="min-w-0">
              <span className="block font-medium">{f.name}</span>
              <span className="mt-1 flex flex-wrap gap-1">
                <FactorBadges factor={f} />
                <span className="text-xs text-ink-3">{f.group}</span>
              </span>
            </span>
            <Icon name="chevron-down" size={15} className={`mt-0.5 ml-auto text-ink-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </td>
        <td className="right num">
          {factorValue(f.value)} <span className="text-ink-3">{unitLabel(f.unit)}</span>
        </td>
        <td>
          <SourceLink factor={f} />
        </td>
        <td className="text-sm">
          {alts.length === 0 ? (
            <span className="text-ink-3">None from this source</span>
          ) : (
            alts.map((a) => (
              <button key={a.id} className="link mr-2 text-ink-2 hover:text-ink" onClick={() => onJump(a.id)}>
                {a.name} <span className="num text-good">−{Math.round((1 - a.value / f.value) * 100)}%</span>
              </button>
            ))
          )}
        </td>
        <td className="right num text-ink-3">{used > 0 ? used : "–"}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="!bg-surface-2/60">
            <div className="grid gap-4 px-1 pb-2 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
              <Detail factor={f} />
              {f.note && <p className="rounded-lg bg-warn-soft px-3 py-2 text-[13px] text-warn">{f.note}</p>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
