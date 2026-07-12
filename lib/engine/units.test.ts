import { describe, expect, it } from "vitest";
import { convertToDeclared, normaliseUnit } from "./units";

const perTonne = { declaredUnit: "t" as const };
const perKg = { declaredUnit: "kg" as const };
const perM3 = { declaredUnit: "m3" as const, densityKgM3: 2400 };
const perM2 = { declaredUnit: "m2" as const, kgPerDeclaredUnit: 0.5 };

describe("normaliseUnit", () => {
  it("reads common spellings", () => {
    expect(normaliseUnit("Tonnes")?.unit).toBe("t");
    expect(normaliseUnit("m³")?.unit).toBe("m3");
    expect(normaliseUnit("M3.")?.unit).toBe("m3");
    expect(normaliseUnit("sq m")?.unit).toBe("m2");
    expect(normaliseUnit("lfm")?.unit).toBe("m");
    expect(normaliseUnit("Stk")?.unit).toBe("pcs");
  });

  it("returns null for a unit it does not know", () => {
    expect(normaliseUnit("bags")).toBeNull();
    expect(normaliseUnit("")).toBeNull();
  });
});

describe("convertToDeclared", () => {
  it("scales within a dimension", () => {
    const c = convertToDeclared({ quantity: 2500, unit: "kg" }, perTonne);
    expect(c.declaredQuantity).toBe(2.5);
    expect(c.massKg).toBe(2500);
    expect(c.error).toBeNull();
  });

  it("goes from volume to mass with the factor density", () => {
    const c = convertToDeclared({ quantity: 10, unit: "m3" }, { declaredUnit: "t", densityKgM3: 2300 });
    expect(c.declaredQuantity).toBe(23);
    expect(c.description).toContain("2,300 kg/m3");
  });

  it("prefers the line density over the factor density", () => {
    const c = convertToDeclared({ quantity: 10, unit: "m3", densityKgM3: 1800 }, { declaredUnit: "t", densityKgM3: 2300 });
    expect(c.declaredQuantity).toBe(18);
  });

  it("refuses volume to mass without any density", () => {
    const c = convertToDeclared({ quantity: 10, unit: "m3" }, perKg);
    expect(c.error).toMatch(/density/);
    expect(c.declaredQuantity).toBeNull();
  });

  it("goes from mass to volume with the factor density", () => {
    const c = convertToDeclared({ quantity: 4.8, unit: "t" }, perM3);
    expect(c.declaredQuantity).toBeCloseTo(2);
  });

  it("needs kg/m for a length line on a mass factor", () => {
    expect(convertToDeclared({ quantity: 100, unit: "m" }, perKg).error).toMatch(/kg\/m/);
    const c = convertToDeclared({ quantity: 100, unit: "m", kgPerUnit: 1.95 }, perKg);
    expect(c.declaredQuantity).toBeCloseTo(195);
  });

  it("reaches a per-m2 factor from mass through kg per declared unit", () => {
    const c = convertToDeclared({ quantity: 50, unit: "kg" }, perM2);
    expect(c.declaredQuantity).toBe(100);
  });

  it("never converts pieces", () => {
    expect(convertToDeclared({ quantity: 6, unit: "pcs" }, perTonne).error).toMatch(/Cannot convert/);
  });

  it("rejects missing and negative quantities", () => {
    expect(convertToDeclared({ quantity: null, unit: "t" }, perTonne).error).toBe("No quantity");
    expect(convertToDeclared({ quantity: -1, unit: "t" }, perTonne).error).toBe("Negative quantity");
    expect(convertToDeclared({ quantity: 1, unit: "bags" }, perTonne).error).toMatch(/Unknown unit/);
  });
});
