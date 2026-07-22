"use client";

import { parseNumber } from "@/lib/bom/parse";
import { catalogue } from "@/lib/catalogue";
import { confidenceLabel, isCounted, normaliseUnit, type BomLine, type Totals } from "@/lib/engine";
import { factorValue, tonnes } from "@/lib/format";
import { actions } from "@/lib/store";
import { FactorSelect } from "./FactorSelect";

const field =
  "w-full rounded border border-zinc-200 bg-transparent px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none aria-[invalid=true]:border-red-500 dark:border-zinc-700";

function NumberField({ value, label, onChange }: { value: number | null | undefined; label: string; onChange: (value: number | null) => void }) {
  return (
    <input
      key={String(value ?? "")}
      aria-label={label}
      inputMode="decimal"
      className={`${field} text-right tabular-nums`}
      defaultValue={value ?? ""}
      onBlur={(e) => {
        const next = parseNumber(e.target.value);
        if (next !== (value ?? null)) onChange(next);
      }}
    />
  );
}

function StatusPill({ line, autoAcceptHigh }: { line: BomLine; autoAcceptHigh: boolean }) {
  const base = "inline-block rounded-full px-2 py-0.5 text-xs font-medium";
  if (line.status === "accepted") return <span className={`${base} bg-emerald-100 text-emerald-800`}>Accepted</span>;
  if (line.status === "rejected") return <span className={`${base} bg-zinc-200 text-zinc-600`}>Rejected</span>;
  if (isCounted(line, { autoAcceptHigh })) return <span className={`${base} bg-emerald-50 text-emerald-700`}>Auto-accepted</span>;
  return <span className={`${base} bg-amber-100 text-amber-800`}>Needs review</span>;
}

export function ReviewTable({ lines, totals, autoAcceptHigh }: { lines: BomLine[]; totals: Totals; autoAcceptHigh: boolean }) {
  function decide(line: BomLine, status: BomLine["status"]) {
    actions.setStatus([line.id], line.status === status ? "pending" : status);
  }

  return (
    <table className="mt-4 w-full text-left text-sm">
      <thead className="border-b border-zinc-300 text-zinc-500 dark:border-zinc-700">
        <tr>
          <th className="py-2 pr-3 font-medium">Line</th>
          <th className="w-24 py-2 pr-3 font-medium">Quantity</th>
          <th className="w-20 py-2 pr-3 font-medium">Unit</th>
          <th className="w-20 py-2 pr-3 font-medium">kg/unit</th>
          <th className="py-2 pr-3 font-medium">Factor</th>
          <th className="w-20 py-2 pr-3 text-right font-medium">tCO₂e</th>
          <th className="w-44 py-2 font-medium">Decision</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, i) => {
          const factor = line.factorId ? catalogue.byId.get(line.factorId) : undefined;
          const result = totals.results[i];
          return (
            <tr key={line.id} className={`border-b border-zinc-100 align-top dark:border-zinc-800 ${line.status === "rejected" ? "opacity-50" : ""}`}>
              <td className="py-2 pr-3">
                <input
                  key={line.description}
                  aria-label={`Description of ${line.description}`}
                  className={`${field} font-medium`}
                  defaultValue={line.description}
                  onBlur={(e) => {
                    if (e.target.value !== line.description) actions.updateLine(line.id, { description: e.target.value });
                  }}
                />
                <div className="mt-1 text-xs text-zinc-500">
                  {line.section ? `${line.section} · ` : ""}
                  {line.source.ref}: <span className="font-mono">{line.source.snippet}</span>
                </div>
              </td>
              <td className="py-2 pr-3">
                <NumberField value={line.quantity} label={`Quantity of ${line.description}`} onChange={(quantity) => actions.updateLine(line.id, { quantity })} />
              </td>
              <td className="py-2 pr-3">
                <input
                  key={line.unit}
                  aria-label={`Unit of ${line.description}`}
                  aria-invalid={!normaliseUnit(line.unit)}
                  className={field}
                  defaultValue={line.unit}
                  onBlur={(e) => {
                    if (e.target.value !== line.unit) actions.updateLine(line.id, { unit: e.target.value });
                  }}
                />
              </td>
              <td className="py-2 pr-3">
                <NumberField value={line.kgPerUnit} label={`kg per unit of ${line.description}`} onChange={(kgPerUnit) => actions.updateLine(line.id, { kgPerUnit })} />
              </td>
              <td className="py-2 pr-3">
                <FactorSelect
                  className={field}
                  label={`Factor for ${line.description}`}
                  value={line.factorId}
                  onChange={(factorId) => actions.updateLine(line.id, { factorId, confidence: 1, matchReason: "Chosen by the reviewer" })}
                />
                <div className="mt-1 text-xs text-zinc-500">
                  {factor && `${factorValue(factor.value)} ${factor.unit}${factor.applicability === "proxy" ? " · proxy" : ""} · `}
                  {line.matchReason} · {confidenceLabel(line.confidence)} confidence
                </div>
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {result.kgCO2e !== null ? tonnes(result.kgCO2e) : <span className="text-xs text-red-600">{result.error}</span>}
              </td>
              <td className="py-2">
                <StatusPill line={line} autoAcceptHigh={autoAcceptHigh} />
                <div className="mt-1 flex gap-1">
                  <button
                    className="rounded border border-zinc-300 px-2 py-0.5 text-xs aria-pressed:bg-emerald-600 aria-pressed:text-white dark:border-zinc-700"
                    aria-pressed={line.status === "accepted"}
                    onClick={() => decide(line, "accepted")}
                  >
                    Accept
                  </button>
                  <button
                    className="rounded border border-zinc-300 px-2 py-0.5 text-xs aria-pressed:bg-zinc-700 aria-pressed:text-white dark:border-zinc-700"
                    aria-pressed={line.status === "rejected"}
                    onClick={() => decide(line, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
