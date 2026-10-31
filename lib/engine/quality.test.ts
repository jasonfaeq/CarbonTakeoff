import { describe, expect, it } from "vitest";
import { buildCatalogue } from "./catalogue";
import { computeTotals } from "./calc";
import { intensity, lineQuality, qualitySummary } from "./quality";
import type { BomLine, Factor } from "./types";

function factor(id: string, patch: Partial<Factor>): Factor {
  return {
    id,
    name: id,
    group: "Steel",
    value: 1,
    unit: "kg CO2e/t",
    declaredUnit: "t",
    scope: "",
    source: "test",
    sourceName: "test",
    tableRow: "",
    versionYear: "",
    licence: "",
    url: "",
    retrieved: "",
    status: "VERIFIED",
    applicability: "direct",
    alternatives: [],
    note: null,
    ...patch,
  };
}

const catalogue = buildCatalogue([
  factor("direct", {}),
  factor("proxy", { applicability: "proxy" }),
  factor("placeholder", { status: "PLACEHOLDER" }),
]);

function line(id: string, factorId: string, confidence: number, quantity = 1000): BomLine {
  return {
    id,
    description: id,
    quantity,
    unit: "t",
    factorId,
    confidence,
    matchReason: "",
    status: "accepted",
    source: { kind: "manual", file: "", ref: "", snippet: "" },
  };
}

describe("lineQuality", () => {
  it("is good only for a sourced, direct, confident match", () => {
    expect(lineQuality({ confidence: 0.9 }, catalogue.byId.get("direct"))).toBe("good");
    expect(lineQuality({ confidence: 1 }, catalogue.byId.get("proxy"))).toBe("fair");
    expect(lineQuality({ confidence: 0.6 }, catalogue.byId.get("direct"))).toBe("fair");
    expect(lineQuality({ confidence: 0.3 }, catalogue.byId.get("direct"))).toBe("poor");
    expect(lineQuality({ confidence: 0.9 }, catalogue.byId.get("placeholder"))).toBe("poor");
  });
});

describe("qualitySummary", () => {
  it("weights the counted total by tier and grades it", () => {
    const lines = [line("a", "direct", 0.9, 3000), line("b", "proxy", 0.6, 1000)];
    const q = qualitySummary(lines, computeTotals(lines, catalogue, { autoAcceptHigh: true }), catalogue);
    expect(q.kgCO2e).toEqual({ good: 3000, fair: 1000, poor: 0 });
    expect(q.score).toBeCloseTo(87.5);
    expect(q.grade).toBe("A");
  });

  it("is an E for a total resting on placeholders", () => {
    const lines = [line("a", "placeholder", 0.9)];
    expect(qualitySummary(lines, computeTotals(lines, catalogue, { autoAcceptHigh: true }), catalogue).grade).toBe("E");
  });
});

describe("intensity", () => {
  it("divides by the functional unit, and refuses a missing or zero unit", () => {
    expect(intensity(500_000, { quantity: 4.2, unit: "MW" })).toBeCloseTo(119047.6, 0);
    expect(intensity(100, { quantity: 0, unit: "m²" })).toBeNull();
    expect(intensity(100, null)).toBeNull();
  });
});
