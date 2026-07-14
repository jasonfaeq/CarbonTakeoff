import { describe, expect, it } from "vitest";
import { catalogue } from "@/lib/catalogue";
import { computeLine, computeTotals, isCounted, topShare } from "./calc";
import type { BomLine } from "./types";

function line(patch: Partial<BomLine>): BomLine {
  return {
    id: patch.id ?? "l1",
    description: "test line",
    quantity: 10,
    unit: "m3",
    factorId: "concrete-c30-37",
    confidence: 0.9,
    matchReason: "test",
    status: "pending",
    source: { kind: "manual", file: "test", ref: "Row 1", snippet: "" },
    ...patch,
  };
}

const auto = { autoAcceptHigh: true };
const manual = { autoAcceptHigh: false };

describe("isCounted", () => {
  it("counts accepted lines and never rejected ones", () => {
    expect(isCounted(line({ status: "accepted", confidence: 0.1 }), manual)).toBe(true);
    expect(isCounted(line({ status: "rejected" }), auto)).toBe(false);
  });

  it("counts pending lines only with auto-accept, a factor and high confidence", () => {
    expect(isCounted(line({}), auto)).toBe(true);
    expect(isCounted(line({}), manual)).toBe(false);
    expect(isCounted(line({ confidence: 0.6 }), auto)).toBe(false);
    expect(isCounted(line({ factorId: null }), auto)).toBe(false);
  });
});

describe("computeLine", () => {
  it("multiplies the declared quantity by the factor", () => {
    const factor = catalogue.byId.get("concrete-c30-37")!;
    const r = computeLine(line({ quantity: 100 }), catalogue, auto);
    expect(r.kgCO2e).toBeCloseTo(100 * factor.value);
    expect(r.conversion).toBe("100 m3");
  });

  it("reports a missing factor as an error, not as zero", () => {
    const r = computeLine(line({ factorId: null }), catalogue, auto);
    expect(r.kgCO2e).toBeNull();
    expect(r.error).toBe("No factor");
  });

  it("passes conversion errors through", () => {
    const r = computeLine(line({ unit: "pcs" }), catalogue, auto);
    expect(r.kgCO2e).toBeNull();
    expect(r.error).toMatch(/Cannot convert/);
  });
});

describe("computeTotals", () => {
  const lines = [
    line({ id: "a", quantity: 100, section: "Foundation" }),
    line({ id: "b", quantity: 2, unit: "t", factorId: "rebar", section: "Foundation" }),
    line({ id: "c", quantity: 50, unit: "t", factorId: "aggregates-primary", section: "Roads" }),
    line({ id: "d", status: "rejected", quantity: 1000 }),
    line({ id: "e", status: "accepted", factorId: null }),
    line({ id: "f", confidence: 0.5 }),
  ];
  const totals = computeTotals(lines, catalogue, auto);

  it("sums only counted lines", () => {
    const expected = ["a", "b", "c"].map((id) => computeLine(lines.find((l) => l.id === id)!, catalogue, auto).kgCO2e!);
    expect(totals.kgCO2e).toBeCloseTo(expected.reduce((a, b) => a + b));
    expect(totals.countedLines).toBe(3);
  });

  it("counts what is left out", () => {
    expect(totals.rejectedLines).toBe(1);
    expect(totals.uncountedLines).toBe(1);
    expect(totals.pendingLines).toBe(1);
  });

  it("breaks the total down by group and section, largest first", () => {
    expect(totals.byGroup[0].key).toBe("Concrete & cement");
    expect(totals.byGroup.reduce((s, g) => s + g.kgCO2e, 0)).toBeCloseTo(totals.kgCO2e);
    expect(totals.bySection.map((s) => s.key)).toEqual(["Foundation", "Roads"]);
    expect(totals.bySection[0].lines).toBe(2);
  });

  it("ranks lines and measures concentration", () => {
    expect(totals.ranked[0].lineId).toBe("a");
    expect(topShare(totals, 1)).toBeGreaterThan(0.5);
    expect(topShare(totals, 10)).toBeCloseTo(1);
  });
});
