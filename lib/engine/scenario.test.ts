import { describe, expect, it } from "vitest";
import { catalogue } from "@/lib/catalogue";
import { computeLine } from "./calc";
import { alternativesFor, applySwitches, computeScenario, switchAll } from "./scenario";
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
const steel = line("steel", { quantity: 14, factorId: "steel-section-bof" });
const aggregate = line("agg", { quantity: 1200, factorId: "aggregates-primary" });
const rebar = line("rebar", { quantity: 82, factorId: "rebar" });
const rejected = line("rejected", { factorId: "steel-section-bof", status: "rejected" });

describe("alternativesFor", () => {
  it("lists sourced alternatives, lowest first", () => {
    const alts = alternativesFor(aggregate, catalogue);
    expect(alts.length).toBeGreaterThan(1);
    expect(alts[0].value).toBeLessThanOrEqual(alts[1].value);
  });

  it("returns nothing when the factor has no alternative or there is no factor", () => {
    expect(alternativesFor(rebar, catalogue)).toEqual([]);
    expect(alternativesFor(line("x", {}), catalogue)).toEqual([]);
  });
});

describe("applySwitches", () => {
  it("ignores a switch that is not an alternative of the current factor", () => {
    const [out] = applySwitches([rebar], { rebar: "steel-section-eaf" }, catalogue);
    expect(out.factorId).toBe("rebar");
  });
});

describe("computeScenario", () => {
  const lines = [steel, aggregate, rebar, rejected];

  it("is zero with no switches", () => {
    const r = computeScenario(lines, {}, catalogue, options);
    expect(r.savingsKgCO2e).toBe(0);
    expect(r.lines).toEqual([]);
  });

  it("saves the difference between the factors on the switched line", () => {
    const r = computeScenario(lines, { steel: "steel-section-eaf" }, catalogue, options);
    const before = computeLine(steel, catalogue, options).kgCO2e!;
    const after = computeLine({ ...steel, factorId: "steel-section-eaf" }, catalogue, options).kgCO2e!;
    expect(r.savingsKgCO2e).toBeCloseTo(before - after);
    expect(r.savingsPercent).toBeCloseTo(((before - after) / r.baseline.kgCO2e) * 100);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]).toMatchObject({ lineId: "steel", toFactorId: "steel-section-eaf" });
  });

  it("does not count savings on rejected lines", () => {
    const r = computeScenario(lines, { rejected: "steel-section-eaf" }, catalogue, options);
    expect(r.savingsKgCO2e).toBe(0);
  });
});

describe("switchAll", () => {
  it("switches every counted line that has an alternative, to the lowest", () => {
    const s = switchAll([steel, aggregate, rebar, rejected], catalogue, options);
    expect(Object.keys(s).sort()).toEqual(["agg", "steel"]);
    expect(s.agg).toBe(alternativesFor(aggregate, catalogue)[0].id);
  });
});
