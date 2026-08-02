import { describe, expect, it } from "vitest";
import { catalogue, spendData } from "@/lib/catalogue";
import { computeLine } from "./calc";
import { compareAccounting, computeSpendTotals, defaultComparisonLines, spendFactorFor, spendKgCO2e } from "./spend";
import type { BomLine } from "./types";

function line(id: string, patch: Partial<BomLine>): BomLine {
  return {
    id,
    description: id,
    quantity: 10,
    unit: "t",
    factorId: null,
    confidence: 0.9,
    matchReason: "test",
    status: "accepted",
    source: { kind: "manual", file: "test", ref: id, snippet: "" },
    ...patch,
  };
}

const options = { autoAcceptHigh: true };
const steel = line("steel", { quantity: 14, factorId: "steel-section-bof", unitPriceEur: 2150 });
const concrete = line("concrete", { quantity: 640, unit: "m3", factorId: "concrete-c30-37", unitPriceEur: 135 });
const switchgear = line("switchgear", { quantity: 6, unit: "pcs", naics: "335313", unitPriceEur: 38000 });
const unpriced = line("unpriced", { factorId: "rebar" });

describe("spend-based estimate", () => {
  it("finds the commodity through the factor, or through the line", () => {
    expect(spendFactorFor(steel, spendData)?.naics).toBe(spendData.factorToNaics["steel-section-bof"]);
    expect(spendFactorFor(switchgear, spendData)?.naics).toBe("335313");
    expect(spendFactorFor(line("x", {}), spendData)).toBeNull();
  });

  it("is euros times the exchange rate times the factor", () => {
    const factor = spendFactorFor(steel, spendData)!;
    expect(spendKgCO2e(1000, factor, spendData)).toBeCloseTo(1000 * spendData.fx.usdPerEur * factor.value);
  });

  it("totals priced lines and lists the rest as missing", () => {
    const totals = computeSpendTotals([steel, concrete, switchgear, unpriced], spendData, options);
    expect(totals.lines).toHaveLength(3);
    expect(totals.eur).toBe(14 * 2150 + 640 * 135 + 6 * 38000);
    expect(totals.missing).toEqual(["unpriced"]);
  });
});

describe("compareAccounting", () => {
  const lines = [steel, concrete, switchgear];
  const switches = { steel: "steel-section-eaf" };

  it("moves the two methods in opposite directions", () => {
    const c = compareAccounting(lines, switches, 15, catalogue, spendData, options);
    expect(c.switchedLineIds).toEqual(["steel"]);
    expect(c.spendBased.scopeSwitched / c.spendBased.scopeBaseline).toBeCloseTo(1.15);
    expect(c.activityBased.scopeSwitched).toBeLessThan(c.activityBased.scopeBaseline);
    const before = computeLine(steel, catalogue, options).kgCO2e!;
    const after = computeLine({ ...steel, factorId: "steel-section-eaf" }, catalogue, options).kgCO2e!;
    expect(c.activityBased.baseline - c.activityBased.switched).toBeCloseTo(before - after);
  });

  it("charges the premium only on switched lines", () => {
    const c = compareAccounting(lines, switches, 20, catalogue, spendData, options);
    expect(c.eurSwitched - c.eurBaseline).toBeCloseTo(14 * 2150 * 0.2);
  });

  it("changes nothing at a zero premium on the spend side", () => {
    const c = compareAccounting(lines, switches, 0, catalogue, spendData, options);
    expect(c.spendBased.switched).toBeCloseTo(c.spendBased.baseline);
  });

  it("picks priced steel lines with an alternative by default", () => {
    expect(defaultComparisonLines([steel, concrete, unpriced], catalogue, options)).toEqual(["steel"]);
  });
});
