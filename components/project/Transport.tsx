"use client";

import { useMemo, useState } from "react";
import { parseNumber } from "@/lib/bom/parse";
import { catalogue, transportModes, transportScope } from "@/lib/catalogue";
import { computeTransportTotals, NO_SECTION } from "@/lib/engine";
import { factorValue, percent, quantity, tonnes } from "@/lib/format";
import { actions } from "@/lib/store";
import { BarList } from "../charts/BarList";
import { Icon } from "../Icon";
import { Badge, EmptyState, Kpi, Swatch } from "../ui";
import { useCurrentProject } from "./context";

export function Transport() {
  const { project, totals } = useCurrentProject();
  const { id, lines } = project;
  const transport = useMemo(() => computeTransportTotals(lines, totals.results, transportModes), [lines, totals]);
  const [section, setSection] = useState("all");
  const [mode, setMode] = useState(transportModes[0]?.id ?? "");
  const [km, setKm] = useState("");
  const byLine = new Map(transport.results.map((r) => [r.lineId, r]));
  const counted = lines.filter((l) => byLine.has(l.id));
  const sections = [...new Set(counted.map((l) => l.section?.trim() || NO_SECTION))];
  const placeholder = transportModes.some((m) => m.status === "PLACEHOLDER");

  if (counted.length === 0) {
    return (
      <EmptyState icon="truck" title="Nothing counted yet">
        Transport to site is worked out for counted lines from their mass. Accept some lines first.
      </EmptyState>
    );
  }

  const target = counted.filter((l) => section === "all" || (l.section?.trim() || NO_SECTION) === section);
  const distance = parseNumber(km);

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi
          accent
          icon="truck"
          label="Transport to site, A4"
          value={tonnes(transport.kgCO2e)}
          unit="tCO₂e"
          detail={totals.kgCO2e > 0 ? `${percent((transport.kgCO2e / totals.kgCO2e) * 100)} on top of A1–A3` : undefined}
        />
        <Kpi
          icon="scale"
          label="Freight"
          value={Math.round(transport.tkm).toLocaleString("en-GB")}
          unit="tonne-km"
          detail="Mass of counted lines × distance"
        />
        <Kpi
          icon="alert"
          label="Lines without a leg"
          value={`${transport.unset}/${counted.length}`}
          detail={transport.unset > 0 ? "Not in the A4 figure until a mode and distance are set" : "Every counted line has a leg"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="card p-5">
          <h3 className="font-semibold">By mode</h3>
          <div className="mt-4">
            {transport.byMode.length === 0 ? (
              <p className="text-sm text-ink-3">No line has a transport leg yet.</p>
            ) : (
              <BarList
                data={transport.byMode.map((m) => ({
                  key: m.key,
                  value: m.kgCO2e,
                  color: "var(--m-transport)",
                  detail: `${Math.round(m.tkm)} tonne-km`,
                }))}
                format={tonnes}
              />
            )}
          </div>
          <p className="mt-4 text-xs text-ink-3">{transportScope}</p>
        </section>

        <section className="card p-5">
          <h3 className="font-semibold">Set a leg for many lines</h3>
          <p className="mt-1 text-sm text-ink-3">
            Same mode and distance for every counted line in a section, or all of them. Undo if it was the wrong one.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end">
            <label className="grid gap-1 text-xs text-ink-3">
              Lines
              <select className="field field-sm" value={section} onChange={(e) => setSection(e.target.value)}>
                <option value="all">All counted lines ({counted.length})</option>
                {sections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-ink-3">
              Mode
              <select className="field field-sm" value={mode} onChange={(e) => setMode(e.target.value)}>
                {transportModes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-ink-3">
              Distance, km
              <input className="field field-sm num" inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} placeholder="e.g. 120" />
            </label>
            <button
              className="btn btn-primary btn-sm"
              disabled={distance === null || distance < 0 || target.length === 0}
              onClick={() =>
                actions.updateLines(
                  id,
                  target.map((l) => l.id),
                  { transport: { mode, km: distance } },
                )
              }
            >
              Apply to {target.length}
            </button>
          </div>
        </section>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table min-w-[900px]">
          <thead>
            <tr>
              <th>Line</th>
              <th className="right w-28">Mass, t</th>
              <th className="w-56">Mode</th>
              <th className="right w-32">Distance, km</th>
              <th className="right w-28">tonne-km</th>
              <th className="right w-28">A4, tCO₂e</th>
            </tr>
          </thead>
          <tbody>
            {counted.map((line) => {
              const r = byLine.get(line.id)!;
              const result = totals.results.find((x) => x.lineId === line.id)!;
              const factor = catalogue.byId.get(line.factorId ?? "");
              return (
                <tr key={line.id}>
                  <td>
                    <div className="flex items-center gap-2 font-medium">
                      <Swatch group={factor?.group} />
                      {line.description}
                    </div>
                    {line.section && <div className="mt-0.5 pl-5 text-xs text-ink-3">{line.section}</div>}
                  </td>
                  <td className="right num">
                    {result.massKg !== null ? quantity(Math.round(result.massKg / 100) / 10) : <span className="text-ink-3">–</span>}
                  </td>
                  <td>
                    <select
                      aria-label={`Transport mode for ${line.description}`}
                      className="field field-sm"
                      value={line.transport ? (r.mode?.id ?? line.transport.mode) : ""}
                      onChange={(e) =>
                        actions.updateLine(id, line.id, {
                          transport: e.target.value ? { mode: e.target.value, km: line.transport?.km ?? null } : null,
                        })
                      }
                    >
                      <option value="">Not set</option>
                      {transportModes.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      key={String(line.transport?.km ?? "")}
                      aria-label={`Distance for ${line.description}`}
                      className="field field-sm field-quiet num text-right"
                      inputMode="decimal"
                      disabled={!line.transport}
                      defaultValue={line.transport?.km ?? ""}
                      placeholder="–"
                      onBlur={(e) => {
                        const next = parseNumber(e.target.value);
                        if (line.transport && next !== line.transport.km)
                          actions.updateLine(id, line.id, { transport: { ...line.transport, km: next } });
                      }}
                    />
                  </td>
                  <td className="right num text-ink-2">{r.tkm !== null ? Math.round(r.tkm).toLocaleString("en-GB") : "–"}</td>
                  <td className="right num font-medium">
                    {r.error ? (
                      <Badge tone="bad">
                        <Icon name="alert" size={12} /> {r.error}
                      </Badge>
                    ) : r.kgCO2e !== null ? (
                      tonnes(r.kgCO2e)
                    ) : (
                      <span className="text-ink-3">–</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <Icon name="info" size={13} />
        Freight factors: {transportModes.map((m) => `${m.name} ${factorValue(m.value)}`).join(" · ")} kg CO₂e per tonne-km.
        {placeholder && <Badge tone="outline">Placeholder</Badge>}
      </p>
    </div>
  );
}
