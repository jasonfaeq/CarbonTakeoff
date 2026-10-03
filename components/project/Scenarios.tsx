"use client";

import { useMemo, useState } from "react";
import { catalogue } from "@/lib/catalogue";
import { alternativesFor, computeScenario, switchAll, type BomLine } from "@/lib/engine";
import { factorValue, percent, tonnes } from "@/lib/format";
import { actions, activeScenario } from "@/lib/store";
import { Waterfall } from "../charts/Waterfall";
import { Icon } from "../Icon";
import { EmptyState, Kpi, Swatch } from "../ui";
import { useCurrentProject } from "./context";

const STEPS_SHOWN = 8;

export function Scenarios() {
  const { project, options, totals } = useCurrentProject();
  const { id, lines } = project;
  const scenario = activeScenario(project);
  const switches = useMemo(() => scenario?.switches ?? {}, [scenario]);
  const [renaming, setRenaming] = useState(false);
  const result = useMemo(() => computeScenario(lines, switches, catalogue, options), [lines, switches, options]);
  const possible = useMemo(() => switchAll(lines, catalogue, options), [lines, options]);
  const possibleCount = Object.keys(possible).length;
  const all = useMemo(
    () => project.scenarios.map((s) => ({ scenario: s, result: computeScenario(lines, s.switches, catalogue, options) })),
    [project.scenarios, lines, options],
  );

  if (totals.countedLines === 0) {
    return (
      <EmptyState icon="branch" title="Nothing counted yet">
        Scenarios switch counted lines to sourced lower-carbon factors. Accept some lines first.
      </EmptyState>
    );
  }

  if (!scenario) {
    return (
      <EmptyState
        icon="branch"
        title="No scenario yet"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <button className="btn btn-primary" disabled={possibleCount === 0} onClick={() => actions.createScenario(id, "Lowest sourced", possible)}>
              <Icon name="leaf" size={15} /> Switch everything possible ({possibleCount})
            </button>
            <button className="btn" onClick={() => actions.createScenario(id, "Scenario 1")}>
              Start an empty scenario
            </button>
          </div>
        }
      >
        A scenario is a named set of switches to lower-carbon factors from the same source. Make a few and compare them.
      </EmptyState>
    );
  }

  const byId = new Map(lines.map((l) => [l.id, l]));
  const steps = result.lines.slice(0, STEPS_SHOWN).map((s) => ({
    key: s.lineId,
    label: byId.get(s.lineId)?.description ?? s.lineId,
    value: s.savingKgCO2e,
    group: catalogue.byId.get(s.toFactorId)?.group,
  }));
  const rest = result.lines.slice(STEPS_SHOWN);
  if (rest.length > 0) {
    steps.push({ key: "rest", label: `${rest.length} more lines`, value: rest.reduce((sum, s) => sum + s.savingKgCO2e, 0), group: undefined });
  }
  const counted = lines
    .map((line, i) => ({ line, base: result.baseline.results[i], after: result.scenario.results[i] }))
    .filter(({ base }) => base.counted && base.kgCO2e !== null)
    .sort((a, b) => b.base.kgCO2e! - a.base.kgCO2e!);
  const best = Math.max(...all.map((a) => a.result.baseline.kgCO2e), 1);

  function choose(line: BomLine, factorId: string | null) {
    actions.setSwitch(id, line.id, factorId);
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Scenarios">
          {project.scenarios.map((s) => (
            <button key={s.id} className="chip" aria-pressed={s.id === scenario.id} onClick={() => actions.setActiveScenario(id, s.id)}>
              {s.name} <span className="count">{Object.keys(s.switches).length}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => actions.createScenario(id, `Scenario ${project.scenarios.length + 1}`)}>
          <Icon name="plus" size={14} /> New
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {renaming ? (
            <input
              autoFocus
              aria-label="Scenario name"
              className="field field-sm w-48"
              defaultValue={scenario.name}
              onBlur={(e) => {
                const name = e.target.value.trim();
                if (name && name !== scenario.name) actions.renameScenario(id, scenario.id, name);
                setRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setRenaming(false);
              }}
            />
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setRenaming(true)}>
              <Icon name="edit" size={14} /> Rename
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => actions.duplicateScenario(id, scenario.id)}>
            <Icon name="copy" size={14} /> Duplicate
          </button>
          <button
            className="btn btn-ghost btn-sm btn-danger"
            onClick={() => {
              if (window.confirm(`Delete the scenario "${scenario.name}"?`)) actions.deleteScenario(id, scenario.id);
            }}
          >
            <Icon name="trash" size={14} /> Delete
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi icon="list" label="Baseline" value={tonnes(result.baseline.kgCO2e)} unit="tCO₂e" detail="Counted lines as matched" />
        <Kpi
          accent
          icon="branch"
          label={scenario.name}
          value={tonnes(result.scenario.kgCO2e)}
          unit="tCO₂e"
          detail={`${result.lines.length} lines switched`}
        />
        <Kpi
          icon="leaf"
          label="Saving"
          value={tonnes(result.savingsKgCO2e)}
          unit="tCO₂e"
          detail={result.savingsKgCO2e > 0 ? `${percent(result.savingsPercent)} of the baseline` : "Pick alternatives below"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="card p-5">
          <h3 className="font-semibold">From baseline to {scenario.name}</h3>
          <p className="text-xs text-ink-3">Each switched line, largest saving first</p>
          <div className="mt-4">
            {steps.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-3">No line is switched in this scenario yet.</p>
            ) : (
              <Waterfall
                baseline={result.baseline.kgCO2e}
                steps={steps}
                result={result.scenario.kgCO2e}
                format={(v) => `${tonnes(v)} t`}
                resultLabel={scenario.name}
              />
            )}
          </div>
        </section>

        <section className="card p-5">
          <h3 className="font-semibold">All scenarios</h3>
          <ul className="mt-4 grid gap-3 text-sm">
            <li>
              <div className="flex justify-between">
                <span className="text-ink-2">Baseline</span>
                <span className="num">{tonnes(result.baseline.kgCO2e)} t</span>
              </div>
              <div className="meter mt-1.5">
                <span className="bg-ink-3" style={{ width: "100%" }} />
              </div>
            </li>
            {all.map(({ scenario: s, result: r }) => (
              <li key={s.id}>
                <button className="w-full text-left" onClick={() => actions.setActiveScenario(id, s.id)}>
                  <div className="flex justify-between gap-3">
                    <span className={s.id === scenario.id ? "font-medium" : "text-ink-2"}>{s.name}</span>
                    <span className="num">
                      {tonnes(r.scenario.kgCO2e)} t <span className="text-good">−{percent(r.savingsPercent, 0)}</span>
                    </span>
                  </div>
                  <div className="meter mt-1.5">
                    <span className={s.id === scenario.id ? "bg-brand" : "bg-brand/50"} style={{ width: `${(r.scenario.kgCO2e / best) * 100}%` }} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="card overflow-x-auto">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="font-semibold">Sourced alternatives</h3>
            <p className="text-sm text-ink-3">Only lower factors from the same source. Where none exists, the line says so.</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              className="btn btn-primary btn-sm"
              disabled={possibleCount === 0}
              onClick={() => actions.setScenarioSwitches(id, scenario.id, possible)}
            >
              <Icon name="leaf" size={14} /> Switch all to lowest ({possibleCount})
            </button>
            <button
              className="btn btn-sm"
              disabled={Object.keys(switches).length === 0}
              onClick={() => actions.setScenarioSwitches(id, scenario.id, {})}
            >
              Clear
            </button>
          </div>
        </div>
        <table className="data-table min-w-[820px]">
          <thead>
            <tr>
              <th>Line</th>
              <th>Current factor</th>
              <th className="w-[34%]">Alternative in this scenario</th>
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
