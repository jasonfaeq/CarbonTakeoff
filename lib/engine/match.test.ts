import { describe, expect, it } from "vitest";
import { catalogue } from "@/lib/catalogue";
import { capConfidence, confidenceLabel, matchFactor } from "./match";

describe("matchFactor", () => {
  it("reads the concrete strength class", () => {
    expect(matchFactor("Foundation slab concrete C30/37").factorId).toBe("concrete-c30-37");
    expect(matchFactor("Beton C 25/30 XC4").factorId).toBe("concrete-c25-30");
    expect(matchFactor("Pedestal concrete C50/60").confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("rounds a class between factors up, not down", () => {
    expect(matchFactor("Wall concrete C35/45").factorId).toBe("concrete-c50-60");
    expect(matchFactor("Wall concrete C35/45").confidence).toBe(0.6);
    expect(matchFactor("Lean mix C16/20").factorId).toBe("concrete-c20-25");
    expect(matchFactor("Concrete C55/67").confidence).toBe(0.3);
  });

  it("uses the recycled-aggregate factor when the line says so", () => {
    expect(matchFactor("Recycled aggregate concrete C30/37").factorId).toBe("concrete-rc-c30-37");
  });

  it("falls back to average concrete without a class", () => {
    const m = matchFactor("Mass concrete fill");
    expect(m.factorId).toBe("concrete-average");
    expect(m.confidence).toBeLessThan(0.8);
  });

  it("does not read reinforcement as concrete", () => {
    expect(matchFactor("Reinforcing steel B500B for C30/37 slab").factorId).toBe("rebar");
    expect(matchFactor("Bitumen coating to buried concrete").factorId).toBe("bitumen-emulsion");
  });

  it("keeps specific rules ahead of general ones", () => {
    expect(matchFactor("Transformer oil top-up").factorId).toBe("mineral-oil-primary");
    expect(matchFactor("Power transformer 25 MVA").factorId).toBe("electrical-large");
    expect(matchFactor("Cement CEM III/A 42.5").factorId).toBe("cement-cem3");
    expect(matchFactor("Cement CEM II/A 42.5").factorId).toBe("cement-cem2");
    expect(matchFactor("Steel section EAF route").factorId).toBe("steel-section-eaf");
    expect(matchFactor("Anchor cage structural steel S355").factorId).toBe("steel-section-bof");
  });

  it("matches German descriptions", () => {
    expect(matchFactor("Betonstahl BSt 500").factorId).toBe("rebar");
    expect(matchFactor("Schotter 0/45").factorId).toBe("aggregates-primary");
    expect(matchFactor("Schalung Holz").factorId).toBe("wood-primary");
  });

  it("says so when nothing matches", () => {
    const m = matchFactor("Site welfare cabin hire");
    expect(m.factorId).toBeNull();
    expect(m.confidence).toBe(0);
  });

  it("leaves switchgear without a factor", () => {
    expect(matchFactor("MV switchgear panel").factorId).toBeNull();
  });
});

describe("capConfidence", () => {
  it("caps proxy factors at medium", () => {
    expect(capConfidence(0.9, "electrical-large", catalogue)).toBe(0.6);
    expect(capConfidence(0.9, "rebar", catalogue)).toBe(0.9);
    expect(capConfidence(0.9, null, catalogue)).toBe(0.9);
  });

  it("labels confidence", () => {
    expect(confidenceLabel(0.9)).toBe("High");
    expect(confidenceLabel(0.6)).toBe("Medium");
    expect(confidenceLabel(0.3)).toBe("Low");
  });
});

describe("catalogue", () => {
  it("only points alternatives at factors that exist", () => {
    for (const factor of catalogue.factors) {
      for (const alt of factor.alternatives) expect(catalogue.byId.has(alt), `${factor.id} -> ${alt}`).toBe(true);
    }
  });

  it("only offers alternatives that are lower and in the same unit", () => {
    for (const factor of catalogue.factors) {
      for (const alt of factor.alternatives.map((id) => catalogue.byId.get(id)!)) {
        expect(alt.declaredUnit).toBe(factor.declaredUnit);
        expect(alt.value).toBeLessThan(factor.value);
      }
    }
  });

  it("gives every rule target a factor", () => {
    const ids = ["concrete-average", "mortar-cement", "steel-section-eaf", "geotextile", "wood-primary", "asphalt-primary"];
    for (const id of ids) expect(catalogue.byId.has(id)).toBe(true);
  });
});
