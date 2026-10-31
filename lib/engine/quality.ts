import type { Totals } from "./calc";
import type { Catalogue } from "./catalogue";
import { HIGH_CONFIDENCE } from "./match";
import type { BomLine, Factor } from "./types";

export type QualityTier = "good" | "fair" | "poor";

export const QUALITY_TIERS: { tier: QualityTier; label: string; meaning: string }[] = [
  { tier: "good", label: "Good", meaning: "A sourced factor for this material, matched with high confidence or chosen by a person" },
  { tier: "fair", label: "Fair", meaning: "A proxy factor, or a medium-confidence match" },
  { tier: "poor", label: "Poor", meaning: "A weak match, or a factor that is not sourced (placeholder or unverified)" },
];

/** How much a counted line's number can be trusted, from its factor and its match. */
export function lineQuality(line: Pick<BomLine, "confidence">, factor: Factor | undefined): QualityTier {
  if (!factor || factor.status !== "VERIFIED" || line.confidence < 0.5) return "poor";
  if (factor.applicability === "proxy" || line.confidence < HIGH_CONFIDENCE) return "fair";
  return "good";
}

export interface QualitySummary {
  /** kg CO2e of the counted total in each tier. */
  kgCO2e: Record<QualityTier, number>;
  /** 0 to 100: the share of the total that is good, with fair counting half. */
  score: number;
  grade: "A" | "B" | "C" | "D" | "E";
}

export function qualitySummary(lines: BomLine[], totals: Totals, catalogue: Catalogue): QualitySummary {
  const kgCO2e: Record<QualityTier, number> = { good: 0, fair: 0, poor: 0 };
  const byId = new Map(lines.map((l) => [l.id, l]));
  for (const r of totals.ranked) {
    const line = byId.get(r.lineId);
    if (!line) continue;
    kgCO2e[lineQuality(line, catalogue.byId.get(r.factorId ?? ""))] += r.kgCO2e!;
  }
  const total = kgCO2e.good + kgCO2e.fair + kgCO2e.poor;
  const score = total > 0 ? ((kgCO2e.good + kgCO2e.fair * 0.5) / total) * 100 : 0;
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "E";
  return { kgCO2e, score, grade };
}

export interface FunctionalUnit {
  quantity: number;
  /** What one unit is, e.g. "m² GIA", "MW", "km". */
  unit: string;
}

/** kg CO2e per functional unit, or null without a usable unit. */
export function intensity(kgCO2e: number, unit: FunctionalUnit | null | undefined): number | null {
  if (!unit || !(unit.quantity > 0)) return null;
  return kgCO2e / unit.quantity;
}
