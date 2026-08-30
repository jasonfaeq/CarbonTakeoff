"use client";

import { useMemo } from "react";
import { catalogue } from "@/lib/catalogue";
import { alternativesFor, computeScenario, switchAll, type BomLine, type CalcOptions, type Switches } from "@/lib/engine";
import { factorValue, percent, tonnes } from "@/lib/format";
import { actions } from "@/lib/store";

export function Alternatives({
  projectId,
  lines,
  switches,
  options,
}: {
  projectId: string;
  lines: BomLine[];
  switches: Switches;
  options: CalcOptions;
}) {
  const result = useMemo(() => computeScenario(lines, switches, catalogue, options), [lines, switches, options]);
  const counted = lines
    .map((line, i) => ({ line, base: result.baseline.results[i], after: result.scenario.results[i] }))
    .filter(({ base }) => base.counted && base.kgCO2e !== null)
    .sort((a, b) => b.base.kgCO2e! - a.base.kgCO2e!);
  const possible = switchAll(lines, catalogue, options);

  if (counted.length === 0) return <p className="mt-6 text-zinc-500">No lines are counted yet. Accept some lines in Review.</p>;

  function choose(line: BomLine, factorId: string | null) {
    const next = { ...switches };
    if (factorId) next[line.id] = factorId;
    else delete next[line.id];
    actions.setSwitches(projectId, next);
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Scenario saving</div>
          <div className="text-2xl font-semibold tabular-nums">
            {tonnes(result.savingsKgCO2e)} t <span className="text-base font-normal text-zinc-500">({percent(result.savingsPercent)})</span>
          </div>
          <div className="text-sm text-zinc-500">
            {tonnes(result.baseline.kgCO2e)} t baseline → {tonnes(result.scenario.kgCO2e)} t
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
            disabled={Object.keys(possible).length === 0}
            onClick={() => actions.setSwitches(projectId, possible)}
          >
            Switch all to lowest ({Object.keys(possible).length})
          </button>
          <button
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700"
            disabled={Object.keys(switches).length === 0}
            onClick={() => actions.setSwitches(projectId, {})}
          >
            Clear
          </button>
        </div>
      </div>

      <table className="mt-4 w-full text-left text-sm">
        <thead className="border-b border-zinc-300 text-zinc-500 dark:border-zinc-700">
          <tr>
            <th className="py-2 pr-3 font-medium">Line</th>
            <th className="py-2 pr-3 font-medium">Current factor</th>
            <th className="py-2 pr-3 font-medium">Alternative</th>
            <th className="py-2 text-right font-medium">Saving</th>
          </tr>
        </thead>
        <tbody>
          {counted.map(({ line, base, after }) => {
            const factor = catalogue.byId.get(line.factorId!)!;
            const alts = alternativesFor(line, catalogue);
            const saving = base.kgCO2e! - (after.kgCO2e ?? base.kgCO2e!);
            return (
              <tr key={line.id} className="border-b border-zinc-100 align-top dark:border-zinc-800">
                <td className="py-2 pr-3">
                  <div className="font-medium">{line.description}</div>
                  <div className="text-xs text-zinc-500 tabular-nums">{tonnes(base.kgCO2e!)} t</div>
                </td>
                <td className="py-2 pr-3">
                  <div>{factor.name}</div>
                  <div className="text-xs text-zinc-500">
                    {factorValue(factor.value)} {factor.unit}
                  </div>
                </td>
                <td className="py-2 pr-3">
                  {alts.length === 0 ? (
                    <span className="text-zinc-500">No sourced alternative{factor.note ? `. ${factor.note}` : ""}</span>
                  ) : (
                    <select
                      aria-label={`Alternative for ${line.description}`}
                      className="w-full rounded border border-zinc-200 bg-transparent px-2 py-1 dark:border-zinc-700"
                      value={switches[line.id] ?? ""}
                      onChange={(e) => choose(line, e.target.value || null)}
                    >
                      <option value="">Keep current</option>
                      {alts.map((alt) => (
                        <option key={alt.id} value={alt.id}>
                          {alt.name} ({factorValue(alt.value)} {alt.unit})
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {saving > 0 ? (
                    <>
                      −{tonnes(saving)} t<div className="text-xs text-zinc-500">{percent((saving / base.kgCO2e!) * 100)}</div>
                    </>
                  ) : (
                    "–"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
