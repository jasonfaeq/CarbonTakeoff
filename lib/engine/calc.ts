import type { Catalogue } from "./catalogue";
import { HIGH_CONFIDENCE } from "./match";
import type { BomLine } from "./types";
import { convertToDeclared } from "./units";

export interface CalcOptions {
  /** Count pending lines at or above HIGH_CONFIDENCE as if accepted. */
  autoAcceptHigh: boolean;
}

export interface LineResult {
  lineId: string;
  factorId: string | null;
  counted: boolean;
  declaredQuantity: number | null;
  massKg: number | null;
  /** A1-A3. Null when the line cannot be calculated. */
  kgCO2e: number | null;
  conversion: string;
  error: string | null;
}

export interface Breakdown {
  key: string;
  kgCO2e: number;
  lines: number;
}

export interface Totals {
  kgCO2e: number;
  results: LineResult[];
  byGroup: Breakdown[];
  bySection: Breakdown[];
  /** Carbon by BOM section and material group together, for the flow chart. */
  flows: { section: string; group: string; kgCO2e: number }[];
  /** Counted lines, largest first. */
  ranked: LineResult[];
  countedLines: number;
  pendingLines: number;
  rejectedLines: number;
  /** Lines that should count but cannot: no factor, or a unit that does not convert. */
  uncountedLines: number;
}

export const NO_SECTION = "Unsectioned";

export function isCounted(line: BomLine, options: CalcOptions): boolean {
  if (line.status === "accepted") return true;
  if (line.status === "rejected") return false;
  return options.autoAcceptHigh && line.factorId !== null && line.confidence >= HIGH_CONFIDENCE;
}

export function computeLine(line: BomLine, catalogue: Catalogue, options: CalcOptions): LineResult {
  const counted = isCounted(line, options);
  const base = { lineId: line.id, factorId: line.factorId, counted };
  const factor = line.factorId ? catalogue.byId.get(line.factorId) : undefined;
  if (!factor) {
    return { ...base, declaredQuantity: null, massKg: null, kgCO2e: null, conversion: "", error: "No factor" };
  }
  const conversion = convertToDeclared(line, factor);
  if (conversion.error || conversion.declaredQuantity === null) {
    return { ...base, declaredQuantity: null, massKg: conversion.massKg, kgCO2e: null, conversion: "", error: conversion.error };
  }
  return {
    ...base,
    declaredQuantity: conversion.declaredQuantity,
    massKg: conversion.massKg,
    kgCO2e: conversion.declaredQuantity * factor.value,
    conversion: conversion.description,
    error: null,
  };
}

function breakdown(map: Map<string, { kg: number; lines: number }>): Breakdown[] {
  return [...map.entries()].map(([key, v]) => ({ key, kgCO2e: v.kg, lines: v.lines })).sort((a, b) => b.kgCO2e - a.kgCO2e);
}

function add(map: Map<string, { kg: number; lines: number }>, key: string, kg: number) {
  const entry = map.get(key) ?? { kg: 0, lines: 0 };
  entry.kg += kg;
  entry.lines += 1;
  map.set(key, entry);
}

export function computeTotals(lines: BomLine[], catalogue: Catalogue, options: CalcOptions): Totals {
  const results = lines.map((line) => computeLine(line, catalogue, options));
  const groups = new Map<string, { kg: number; lines: number }>();
  const sections = new Map<string, { kg: number; lines: number }>();
  const flows = new Map<string, Map<string, number>>();
  let kgCO2e = 0;
  let uncountedLines = 0;
  results.forEach((result, i) => {
    if (!result.counted) return;
    if (result.kgCO2e === null) {
      uncountedLines += 1;
      return;
    }
    kgCO2e += result.kgCO2e;
    const group = catalogue.byId.get(result.factorId!)!.group;
    const section = lines[i].section?.trim() || NO_SECTION;
    add(groups, group, result.kgCO2e);
    add(sections, section, result.kgCO2e);
    const bySection = flows.get(section) ?? new Map<string, number>();
    bySection.set(group, (bySection.get(group) ?? 0) + result.kgCO2e);
    flows.set(section, bySection);
  });
  const ranked = results.filter((r) => r.counted && r.kgCO2e !== null).sort((a, b) => b.kgCO2e! - a.kgCO2e!);
  return {
    kgCO2e,
    results,
    byGroup: breakdown(groups),
    bySection: breakdown(sections),
    flows: [...flows.entries()].flatMap(([section, m]) => [...m.entries()].map(([group, kg]) => ({ section, group, kgCO2e: kg }))),
    ranked,
    countedLines: ranked.length,
    pendingLines: lines.filter((line, i) => line.status === "pending" && !results[i].counted).length,
    rejectedLines: lines.filter((line) => line.status === "rejected").length,
    uncountedLines,
  };
}

/** Share of the total carried by the n largest lines, 0 to 1. */
export function topShare(totals: Totals, n: number): number {
  if (totals.kgCO2e <= 0) return 0;
  return totals.ranked.slice(0, n).reduce((sum, r) => sum + r.kgCO2e!, 0) / totals.kgCO2e;
}
