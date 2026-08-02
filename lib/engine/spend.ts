import { computeLine, isCounted, type CalcOptions } from "./calc";
import type { Catalogue } from "./catalogue";
import { alternativesFor, type Switches } from "./scenario";
import type { BomLine, SpendData, SpendFactor } from "./types";

export function spendFactorFor(line: Pick<BomLine, "naics" | "factorId">, spend: SpendData): SpendFactor | null {
  const naics = line.naics ?? (line.factorId ? spend.factorToNaics[line.factorId] : null);
  return spend.factors.find((f) => f.naics === naics) ?? null;
}

/**
 * Spend-based estimate: EUR × USD/EUR × kg CO2e per USD. Euros are read as prices in the
 * factor's base year, with no inflation or purchasing-power adjustment.
 */
export function spendKgCO2e(eur: number, factor: SpendFactor, spend: SpendData): number {
  return eur * spend.fx.usdPerEur * factor.value;
}

export interface SpendLine {
  lineId: string;
  eur: number;
  factor: SpendFactor;
  kgCO2e: number;
}

export interface SpendTotals {
  kgCO2e: number;
  eur: number;
  lines: SpendLine[];
  /** Counted lines left out because they have no price or no spend factor. */
  missing: string[];
}

export function computeSpendTotals(lines: BomLine[], spend: SpendData, options: CalcOptions): SpendTotals {
  const result: SpendTotals = { kgCO2e: 0, eur: 0, lines: [], missing: [] };
  for (const line of lines) {
    if (!isCounted(line, options)) continue;
    const factor = spendFactorFor(line, spend);
    if (!factor || line.unitPriceEur == null || line.quantity == null) {
      result.missing.push(line.id);
      continue;
    }
    const eur = line.quantity * line.unitPriceEur;
    const kgCO2e = spendKgCO2e(eur, factor, spend);
    result.lines.push({ lineId: line.id, eur, factor, kgCO2e });
    result.eur += eur;
    result.kgCO2e += kgCO2e;
  }
  return result;
}

export interface AccountingSide {
  /** Whole-project figures, before and after the switch. */
  baseline: number;
  switched: number;
  /** The part of those figures that belongs to the switched lines. */
  scopeBaseline: number;
  scopeSwitched: number;
}

export interface AccountingComparison {
  premiumPercent: number;
  spendBased: AccountingSide;
  activityBased: AccountingSide;
  eurBaseline: number;
  eurSwitched: number;
  /** Lines actually switched: counted, priced, and with a sourced alternative. */
  switchedLineIds: string[];
}

/**
 * The same purchase, counted two ways. The buyer pays a premium for a lower-carbon product.
 * The spend factor only knows the commodity and the money, so its estimate goes up with the
 * price. The activity factor knows the product, so its estimate goes down.
 */
export function compareAccounting(
  lines: BomLine[],
  switches: Switches,
  premiumPercent: number,
  catalogue: Catalogue,
  spend: SpendData,
  options: CalcOptions,
): AccountingComparison {
  const multiplier = 1 + premiumPercent / 100;
  const spendBased: AccountingSide = { baseline: 0, switched: 0, scopeBaseline: 0, scopeSwitched: 0 };
  const activityBased: AccountingSide = { baseline: 0, switched: 0, scopeBaseline: 0, scopeSwitched: 0 };
  const switchedLineIds: string[] = [];
  let eurBaseline = 0;
  let eurSwitched = 0;

  for (const line of lines) {
    if (!isCounted(line, options)) continue;
    const altId = switches[line.id];
    const altAllowed = Boolean(altId) && alternativesFor(line, catalogue).some((alt) => alt.id === altId);
    const factor = spendFactorFor(line, spend);
    const eur = line.unitPriceEur != null && line.quantity != null ? line.quantity * line.unitPriceEur : null;
    const activity = computeLine(line, catalogue, options).kgCO2e;
    const applied = altAllowed && factor !== null && eur !== null && activity !== null;

    if (activity !== null) {
      const after = applied ? computeLine({ ...line, factorId: altId }, catalogue, options).kgCO2e! : activity;
      activityBased.baseline += activity;
      activityBased.switched += after;
      if (applied) {
        activityBased.scopeBaseline += activity;
        activityBased.scopeSwitched += after;
      }
    }
    if (factor && eur !== null) {
      const before = spendKgCO2e(eur, factor, spend);
      const after = applied ? before * multiplier : before;
      spendBased.baseline += before;
      spendBased.switched += after;
      eurBaseline += eur;
      eurSwitched += applied ? eur * multiplier : eur;
      if (applied) {
        spendBased.scopeBaseline += before;
        spendBased.scopeSwitched += after;
      }
    }
    if (applied) switchedLineIds.push(line.id);
  }

  return { premiumPercent, spendBased, activityBased, eurBaseline, eurSwitched, switchedLineIds };
}

/** The default lines for the comparison: counted steel lines that have a sourced alternative. */
export function defaultComparisonLines(lines: BomLine[], catalogue: Catalogue, options: CalcOptions): string[] {
  return lines
    .filter((line) => isCounted(line, options) && line.unitPriceEur != null)
    .filter((line) => catalogue.byId.get(line.factorId ?? "")?.group === "Steel" && alternativesFor(line, catalogue).length > 0)
    .map((line) => line.id);
}
