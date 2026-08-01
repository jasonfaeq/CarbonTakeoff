import { computeTotals, isCounted, type CalcOptions, type Totals } from "./calc";
import type { Catalogue } from "./catalogue";
import type { BomLine, Factor } from "./types";

/** Line id to the alternative factor id chosen for it. */
export type Switches = Record<string, string>;

export interface LineSaving {
  lineId: string;
  fromFactorId: string;
  toFactorId: string;
  baselineKgCO2e: number;
  scenarioKgCO2e: number;
  savingKgCO2e: number;
}

export interface ScenarioResult {
  baseline: Totals;
  scenario: Totals;
  savingsKgCO2e: number;
  savingsPercent: number;
  /** Switched lines that are counted and calculable, largest saving first. */
  lines: LineSaving[];
}

/** Sourced alternatives for a line, lowest first. Empty means "no sourced alternative". */
export function alternativesFor(line: Pick<BomLine, "factorId">, catalogue: Catalogue): Factor[] {
  const factor = line.factorId ? catalogue.byId.get(line.factorId) : undefined;
  if (!factor) return [];
  return factor.alternatives
    .map((id) => catalogue.byId.get(id))
    .filter((alt): alt is Factor => alt !== undefined)
    .sort((a, b) => a.value - b.value);
}

/** Apply only switches that are still valid alternatives for the line's current factor. */
export function applySwitches(lines: BomLine[], switches: Switches, catalogue: Catalogue): BomLine[] {
  return lines.map((line) => {
    const to = switches[line.id];
    if (!to || !alternativesFor(line, catalogue).some((alt) => alt.id === to)) return line;
    return { ...line, factorId: to };
  });
}

export function computeScenario(lines: BomLine[], switches: Switches, catalogue: Catalogue, options: CalcOptions): ScenarioResult {
  const baseline = computeTotals(lines, catalogue, options);
  const switched = applySwitches(lines, switches, catalogue);
  const scenario = computeTotals(switched, catalogue, options);
  const savingsKgCO2e = baseline.kgCO2e - scenario.kgCO2e;
  const saved: LineSaving[] = [];
  lines.forEach((line, i) => {
    const before = baseline.results[i];
    const after = scenario.results[i];
    if (switched[i] === line || !before.counted || before.kgCO2e === null || after.kgCO2e === null) return;
    saved.push({
      lineId: line.id,
      fromFactorId: line.factorId!,
      toFactorId: switched[i].factorId!,
      baselineKgCO2e: before.kgCO2e,
      scenarioKgCO2e: after.kgCO2e,
      savingKgCO2e: before.kgCO2e - after.kgCO2e,
    });
  });
  return {
    baseline,
    scenario,
    savingsKgCO2e,
    savingsPercent: baseline.kgCO2e > 0 ? (savingsKgCO2e / baseline.kgCO2e) * 100 : 0,
    lines: saved.sort((a, b) => b.savingKgCO2e - a.savingKgCO2e),
  };
}

/** Switch every counted line that has an alternative to its lowest one. */
export function switchAll(lines: BomLine[], catalogue: Catalogue, options: CalcOptions): Switches {
  const switches: Switches = {};
  for (const line of lines) {
    if (!isCounted(line, options)) continue;
    const [lowest] = alternativesFor(line, catalogue);
    if (lowest) switches[line.id] = lowest.id;
  }
  return switches;
}
