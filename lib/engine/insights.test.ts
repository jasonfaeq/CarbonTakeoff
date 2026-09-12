import { describe, expect, it } from "vitest";
import { catalogue } from "@/lib/catalogue";
import { computeTotals } from "./calc";
import { buildInsights } from "./insights";
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

describe("buildInsights", () => {
  const lines = [
    line("slab", { quantity: 640, unit: "m3", factorId: "concrete-c30-37" }),
    line("steel", { quantity: 14, factorId: "steel-section-bof" }),
    line("agg", { quantity: 1200, factorId: "aggregates-primary" }),
    line("timber", { quantity: 9, factorId: "wood-primary" }),
    line("pvc", { quantity: 2, factorId: "pvc-primary" }),
    line("gravel", { quantity: 180, factorId: "gravel" }),
    line("pending", { status: "pending", confidence: 0.3, factorId: "electrical-large" }),
    line("broken", { factorId: null }),
  ];
  const totals = computeTotals(lines, catalogue, options);
  const insights = buildInsights(lines, totals, catalogue, options);
  const ids = insights.map((i) => i.id);

  it("leads with what needs a person", () => {
    expect(ids.slice(0, 2)).toEqual(["review", "uncounted"]);
    expect(insights[0].title).toBe("1 line needs review");
  });

  it("names the biggest material group and line", () => {
    const top = insights.find((i) => i.id === "top-group")!;
    expect(top.title).toMatch(/^Concrete & cement is \d+% of the total$/);
    expect(top.body).toContain("slab");
  });

  it("reports the switch-all saving when there is one", () => {
    expect(insights.find((i) => i.id === "savings")?.action?.href).toBe("/alternatives");
  });

  it("says nothing about the total for an empty project", () => {
    const empty = buildInsights([], computeTotals([], catalogue, options), catalogue, options);
    expect(empty).toEqual([]);
  });
});
