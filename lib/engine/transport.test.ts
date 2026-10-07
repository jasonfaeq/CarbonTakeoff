import { describe, expect, it } from "vitest";
import { catalogue, transportModes } from "@/lib/catalogue";
import { computeLine } from "./calc";
import { computeTransport, computeTransportTotals, findMode } from "./transport";
import type { BomLine } from "./types";

function line(id: string, patch: Partial<BomLine>): BomLine {
  return {
    id,
    description: id,
    quantity: 100,
    unit: "t",
    factorId: "aggregates-primary",
    confidence: 0.9,
    matchReason: "test",
    status: "accepted",
    source: { kind: "manual", file: "test", ref: id, snippet: "" },
    ...patch,
  };
}

const options = { autoAcceptHigh: true };

describe("findMode", () => {
  it("reads ids and everyday words", () => {
    expect(findMode("hgv-average", transportModes)?.id).toBe("hgv-average");
    expect(findMode("Truck", transportModes)?.id).toBe("hgv-average");
    expect(findMode("rail", transportModes)?.id).toBe("rail");
    expect(findMode("container ship", transportModes)?.id).toBe("sea-container");
    expect(findMode("bicycle", transportModes)).toBeNull();
  });
});

describe("computeTransport", () => {
  it("is tonnes times kilometres times the mode factor", () => {
    const l = line("a", { transport: { mode: "hgv-average", km: 50 } });
    const r = computeTransport(l, computeLine(l, catalogue, options), transportModes);
    const mode = findMode("hgv-average", transportModes)!;
    expect(r.tkm).toBe(5000);
    expect(r.kgCO2e).toBeCloseTo(5000 * mode.value);
  });

  it("gives no A4 for a line without a leg, rather than zero", () => {
    const l = line("b", {});
    const r = computeTransport(l, computeLine(l, catalogue, options), transportModes);
    expect(r.kgCO2e).toBeNull();
    expect(r.error).toBeNull();
  });

  it("names a missing distance or an unknown mode", () => {
    const noKm = line("c", { transport: { mode: "rail", km: null } });
    expect(computeTransport(noKm, computeLine(noKm, catalogue, options), transportModes).error).toBe("No distance");
    const odd = line("d", { transport: { mode: "zeppelin", km: 10 } });
    expect(computeTransport(odd, computeLine(odd, catalogue, options), transportModes).error).toMatch(/Unknown transport mode/);
  });

  it("needs a mass, pieces have none", () => {
    const panel = line("e", { quantity: 6, unit: "pcs", factorId: null, transport: { mode: "hgv-average", km: 780 } });
    const r = computeTransport(panel, computeLine(panel, catalogue, options), transportModes);
    expect(r.kgCO2e).toBeNull();
    expect(r.error).toBe("No mass for this line");
  });
});

describe("computeTransportTotals", () => {
  it("sums counted lines by mode and counts the ones without a leg", () => {
    const lines = [
      line("a", { transport: { mode: "hgv-average", km: 50 } }),
      line("b", { transport: { mode: "rail", km: 400 } }),
      line("c", {}),
      line("d", { status: "rejected", transport: { mode: "hgv-average", km: 50 } }),
    ];
    const results = lines.map((l) => computeLine(l, catalogue, options));
    const t = computeTransportTotals(lines, results, transportModes);
    expect(t.byMode).toHaveLength(2);
    expect(t.tkm).toBe(100 * 50 + 100 * 400);
    expect(t.unset).toBe(1);
  });
});
