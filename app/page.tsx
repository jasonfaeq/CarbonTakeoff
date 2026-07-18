"use client";

import { useMemo, useState } from "react";
import { BomParseError, parseCsv } from "@/lib/bom/parse";
import { catalogue, usingPlaceholderFactors } from "@/lib/catalogue";
import { computeTotals, confidenceLabel, type BomLine } from "@/lib/engine";
import { factorValue, quantity, tonnes } from "@/lib/format";

export default function Home() {
  const [lines, setLines] = useState<BomLine[]>([]);
  const [file, setFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const totals = useMemo(() => computeTotals(lines, catalogue, { autoAcceptHigh: true }), [lines]);

  async function onFile(f: File) {
    setError(null);
    try {
      setLines(parseCsv(await f.text(), f.name, catalogue));
      setFile(f.name);
    } catch (e) {
      setError(e instanceof BomParseError ? e.message : "This file could not be read as a CSV.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Carbon Takeoff</h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Load a bill of materials as CSV. Each line is matched to an emission factor and converted to the factor&apos;s unit.
      </p>
      {usingPlaceholderFactors && (
        <p className="mt-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Placeholder factors: the numbers below are synthetic and not a real estimate.
        </p>
      )}

      <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
        Choose a CSV
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>
      <p className="mt-2 text-sm text-zinc-500">Columns: description, quantity, unit. Optional: section, kg_per_unit, unit_price_eur.</p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {lines.length > 0 && (
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-medium">{file}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{tonnes(totals.kgCO2e)}</span> tCO₂e from{" "}
              {totals.countedLines} of {lines.length} lines
            </p>
          </div>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="border-b border-zinc-300 text-zinc-500 dark:border-zinc-700">
              <tr>
                <th className="py-2 pr-3 font-medium">Line</th>
                <th className="py-2 pr-3 text-right font-medium">Quantity</th>
                <th className="py-2 pr-3 font-medium">Factor</th>
                <th className="py-2 pr-3 font-medium">Confidence</th>
                <th className="py-2 text-right font-medium">tCO₂e</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const factor = line.factorId ? catalogue.byId.get(line.factorId) : undefined;
                const result = totals.results[i];
                return (
                  <tr key={line.id} className="border-b border-zinc-100 align-top dark:border-zinc-800">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{line.description}</div>
                      <div className="text-xs text-zinc-500">
                        {line.section ? `${line.section} · ` : ""}
                        {line.source.ref}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {quantity(line.quantity)} {line.unit}
                    </td>
                    <td className="py-2 pr-3">
                      {factor ? (
                        <>
                          <div>{factor.name}</div>
                          <div className="text-xs text-zinc-500">
                            {factorValue(factor.value)} {factor.unit} · {line.matchReason}
                          </div>
                        </>
                      ) : (
                        <span className="text-zinc-500">{line.matchReason}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{confidenceLabel(line.confidence)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {result.kgCO2e !== null ? tonnes(result.kgCO2e) : <span className="text-xs text-red-600">{result.error}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
