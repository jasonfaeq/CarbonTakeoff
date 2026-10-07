import type { LineResult } from "./calc";
import type { BomLine, TransportMode } from "./types";

export interface TransportResult {
  lineId: string;
  mode: TransportMode | null;
  km: number | null;
  /** Tonne-kilometres: the line's mass in tonnes times the distance. */
  tkm: number | null;
  kgCO2e: number | null;
  error: string | null;
}

export interface TransportTotals {
  kgCO2e: number;
  tkm: number;
  byMode: { key: string; kgCO2e: number; tkm: number; lines: number }[];
  results: TransportResult[];
  /** Counted lines with no transport leg set. */
  unset: number;
}

/** "truck", "Lorry" and "hgv-average" all find the average HGV. */
export function findMode(raw: string | null | undefined, modes: TransportMode[]): TransportMode | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  const words = key.split(/[\s,/-]+/);
  return (
    modes.find((m) => m.id === key) ??
    modes.find((m) => m.aliases.includes(key)) ??
    modes.find((m) => m.aliases.some((a) => words.includes(a))) ??
    null
  );
}

/** A4 for one line: tonnes × km × kg CO2e per tonne-km. A line without a leg has no A4, not zero. */
export function computeTransport(line: BomLine, result: LineResult, modes: TransportMode[]): TransportResult {
  const base = { lineId: line.id, km: line.transport?.km ?? null };
  if (!line.transport) return { ...base, mode: null, tkm: null, kgCO2e: null, error: null };
  const mode = findMode(line.transport.mode, modes);
  if (!mode) return { ...base, mode: null, tkm: null, kgCO2e: null, error: `Unknown transport mode "${line.transport.mode}"` };
  if (line.transport.km === null || line.transport.km < 0) return { ...base, mode, tkm: null, kgCO2e: null, error: "No distance" };
  // no mass = no A4. this used to quietly give 0 t for pieces and lines without a density
  if (result.massKg === null) return { ...base, mode, tkm: null, kgCO2e: null, error: "No mass for this line" };
  const tkm = (result.massKg / 1000) * line.transport.km;
  return { ...base, mode, tkm, kgCO2e: tkm * mode.value, error: null };
}

export function computeTransportTotals(lines: BomLine[], results: LineResult[], modes: TransportMode[]): TransportTotals {
  const out: TransportTotals = { kgCO2e: 0, tkm: 0, byMode: [], results: [], unset: 0 };
  const byMode = new Map<string, { kgCO2e: number; tkm: number; lines: number }>();
  lines.forEach((line, i) => {
    if (!results[i].counted) return;
    const r = computeTransport(line, results[i], modes);
    out.results.push(r);
    if (!line.transport) out.unset += 1;
    if (r.kgCO2e === null || !r.mode) return;
    out.kgCO2e += r.kgCO2e;
    out.tkm += r.tkm ?? 0;
    const entry = byMode.get(r.mode.name) ?? { kgCO2e: 0, tkm: 0, lines: 0 };
    entry.kgCO2e += r.kgCO2e;
    entry.tkm += r.tkm ?? 0;
    entry.lines += 1;
    byMode.set(r.mode.name, entry);
  });
  out.byMode = [...byMode.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.kgCO2e - a.kgCO2e);
  return out;
}
