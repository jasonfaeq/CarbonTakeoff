"use client";

import { useMemo } from "react";
import { catalogue } from "@/lib/catalogue";
import { alternativesFor, computeScenario, switchAll, type BomLine, type CalcOptions, type Switches } from "@/lib/engine";
import { factorValue, percent, tonnes } from "@/lib/format";
import { actions } from "@/lib/store";
import { Icon } from "../Icon";
import { EmptyState, Kpi, Swatch } from "../ui";

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
  const possibleCount = Object.keys(possible).length;

  if (counted.length === 0) {
    return (
      <EmptyState icon="branch" title="Nothing counted yet">
        Alternatives are offered for counted lines. Accept some lines in Review first.
      </EmptyState>
    );
  }

  function choose(line: BomLine, factorId: string | null) {
    const next = { ...switches };
    if (factorId) next[line.id] = factorId;
    else delete next[line.id];
    actions.setSwitches(projectId, next);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi
          accent
          icon="leaf"
          label="Scenario saving"
          value={tonnes(result.savingsKgCO2e)}
          unit="tCO₂e"
          detail={`${percent(result.savingsPercent)} of the baseline`}
        />
        <Kpi icon="list" label="Baseline" value={tonnes(result.baseline.kgCO2e)} unit="tCO₂e" detail="Counted lines as matched" />
        <Kpi
          icon="branch"
          label="With switches"
          value={tonnes(result.scenario.kgCO2e)}
          unit="tCO₂e"
          detail={`${result.lines.length} lines switched`}
        />
      </div>

      <div className="card overflow-x-auto">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="font-semibold">Sourced alternatives</h3>
            <p className="text-sm text-ink-3">Only lower factors from the same source. Where none exists, the line says so.</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="btn btn-primary" disabled={possibleCount === 0} onClick={() => actions.setSwitches(projectId, possible)}>
              <Icon name="leaf" size={15} /> Switch all to lowest ({possibleCount})
            </button>
            <button className="btn" disabled={Object.keys(switches).length === 0} onClick={() => actions.setSwitches(projectId, {})}>
              Clear
            </button>
          </div>
        </div>
        <table className="data-table min-w-[820px]">
          <thead>
            <tr>
              <th>Line</th>
              <th>Current factor</th>
              <th className="w-[34%]">Alternative</th>
              <th className="right w-32">Saving</th>
            </tr>
          </thead>
          <tbody>
            {counted.map(({ line, base, after }) => {
              const factor = catalogue.byId.get(line.factorId!)!;
              const alts = alternativesFor(line, catalogue);
              const saving = base.kgCO2e! - (after.kgCO2e ?? base.kgCO2e!);
              return (
                <tr key={line.id}>
                  <td>
                    <div className="flex items-center gap-2 font-medium">
                      <Swatch group={factor.group} />
                      {line.description}
                    </div>
                    <div className="num mt-0.5 pl-5 text-xs text-ink-3">{tonnes(base.kgCO2e!)} tCO₂e</div>
                  </td>
                  <td>
                    <div>{factor.name}</div>
                    <div className="num text-xs text-ink-3">
                      {factorValue(factor.value)} {factor.unit.replace("CO2e", "CO₂e")}
                    </div>
                  </td>
                  <td>
                    {alts.length === 0 ? (
                      <span className="text-sm text-ink-3">No sourced alternative{factor.note ? `. ${factor.note}` : "."}</span>
                    ) : (
                      <select
                        aria-label={`Alternative for ${line.description}`}
                        className="field field-sm"
                        value={switches[line.id] ?? ""}
                        onChange={(e) => choose(line, e.target.value || null)}
                      >
                        <option value="">Keep current</option>
                        {alts.map((alt) => (
                          <option key={alt.id} value={alt.id}>
                            {alt.name} ({factorValue(alt.value)} {alt.unit.replace("CO2e", "CO₂e")})
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="right num">
                    {saving > 0 ? (
                      <>
                        <span className="font-medium text-good">−{tonnes(saving)} t</span>
                        <div className="text-xs text-ink-3">{percent((saving / base.kgCO2e!) * 100)}</div>
                      </>
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
    </div>
  );
}
