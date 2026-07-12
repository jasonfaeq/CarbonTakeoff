import type { BomLine, DeclaredUnit, Factor } from "./types";

export type Dimension = "mass" | "volume" | "area" | "length" | "count";

export interface NormalUnit {
  unit: string;
  dimension: Dimension;
  /** Multiply by this to reach the dimension's base unit: kg, m3, m2 or m. */
  toBase: number;
}

const UNITS: Record<string, NormalUnit> = {
  g: { unit: "g", dimension: "mass", toBase: 0.001 },
  kg: { unit: "kg", dimension: "mass", toBase: 1 },
  t: { unit: "t", dimension: "mass", toBase: 1000 },
  m3: { unit: "m3", dimension: "volume", toBase: 1 },
  l: { unit: "l", dimension: "volume", toBase: 0.001 },
  m2: { unit: "m2", dimension: "area", toBase: 1 },
  m: { unit: "m", dimension: "length", toBase: 1 },
  km: { unit: "km", dimension: "length", toBase: 1000 },
  pcs: { unit: "pcs", dimension: "count", toBase: 1 },
};

const ALIASES: Record<string, string> = {
  gram: "g",
  grams: "g",
  kgs: "kg",
  kilo: "kg",
  kilogram: "kg",
  kilograms: "kg",
  tonne: "t",
  tonnes: "t",
  ton: "t",
  tons: "t",
  mt: "t",
  "m³": "m3",
  "m^3": "m3",
  "cu m": "m3",
  "cu.m": "m3",
  cbm: "m3",
  litre: "l",
  litres: "l",
  liter: "l",
  liters: "l",
  "m²": "m2",
  "m^2": "m2",
  "sq m": "m2",
  "sq.m": "m2",
  sqm: "m2",
  qm: "m2",
  lm: "m",
  lfm: "m",
  metre: "m",
  metres: "m",
  meter: "m",
  meters: "m",
  pc: "pcs",
  piece: "pcs",
  pieces: "pcs",
  no: "pcs",
  nr: "pcs",
  stk: "pcs",
  ea: "pcs",
  each: "pcs",
};

/** "Tonnes", "m³" and "M3." all come out as their canonical unit. Unknown units return null. */
export function normaliseUnit(raw: string): NormalUnit | null {
  const key = raw.trim().toLowerCase().replace(/\.$/, "").replace(/\s+/g, " ");
  return UNITS[ALIASES[key] ?? key] ?? null;
}

const DECLARED_TO_BASE: Record<DeclaredUnit, number> = { kg: 1, t: 1000, m3: 1, m2: 1, m: 1 };
const DECLARED_DIMENSION: Record<DeclaredUnit, Dimension> = {
  kg: "mass",
  t: "mass",
  m3: "volume",
  m2: "area",
  m: "length",
};

export interface Conversion {
  declaredQuantity: number | null;
  /** The line's mass, when it can be known. Transport needs it. */
  massKg: number | null;
  /** The working, written out for the reviewer. */
  description: string;
  error: string | null;
}

function fail(error: string): Conversion {
  return { declaredQuantity: null, massKg: null, description: "", error };
}

function fmt(n: number): string {
  return Number(n.toPrecision(6)).toLocaleString("en-GB");
}

/**
 * Convert a BOM quantity into a factor's declared unit. The same dimension scales directly.
 * Otherwise the quantity goes through kg: volume by density (the line's, then the factor's),
 * length and area by the line's kg per unit, and back out by the factor's density or kg per
 * declared unit. Anything missing is an error, never an assumption.
 */
export function convertToDeclared(
  line: Pick<BomLine, "quantity" | "unit" | "kgPerUnit" | "densityKgM3">,
  factor: Pick<Factor, "declaredUnit" | "densityKgM3" | "kgPerDeclaredUnit">,
): Conversion {
  if (line.quantity === null || !Number.isFinite(line.quantity)) return fail("No quantity");
  if (line.quantity < 0) return fail("Negative quantity");
  const unit = normaliseUnit(line.unit);
  if (!unit) return fail(`Unknown unit "${line.unit}"`);

  const target = factor.declaredUnit;
  const targetDimension = DECLARED_DIMENSION[target];
  const baseQuantity = line.quantity * unit.toBase;

  let massKg: number | null = null;
  let viaMass = "";
  if (unit.dimension === "mass") {
    massKg = baseQuantity;
  } else if (unit.dimension === "volume") {
    const density = line.densityKgM3 ?? factor.densityKgM3 ?? null;
    if (density) {
      massKg = baseQuantity * density;
      viaMass = `${fmt(baseQuantity)} m3 × ${fmt(density)} kg/m3`;
    }
  } else if (unit.dimension === "length" || unit.dimension === "area") {
    if (line.kgPerUnit) {
      const base = unit.dimension === "length" ? "m" : "m2";
      massKg = baseQuantity * line.kgPerUnit;
      viaMass = `${fmt(baseQuantity)} ${base} × ${fmt(line.kgPerUnit)} kg/${base}`;
    }
  }

  if (unit.dimension === targetDimension) {
    const declaredQuantity = baseQuantity / DECLARED_TO_BASE[target];
    const description =
      unit.unit === target ? `${fmt(declaredQuantity)} ${target}` : `${fmt(line.quantity)} ${unit.unit} = ${fmt(declaredQuantity)} ${target}`;
    return { declaredQuantity, massKg, description, error: null };
  }

  if (massKg === null) {
    if (unit.dimension === "volume") return fail("Needs a density (kg/m3) for this factor");
    if (unit.dimension === "length") return fail("Needs kg/m for this factor");
    if (unit.dimension === "area") return fail("Needs kg/m2 for this factor");
    return fail(`Cannot convert ${unit.unit} to ${target}`);
  }

  const prefix = viaMass ? `${viaMass} = ` : "";
  if (targetDimension === "mass") {
    const declaredQuantity = massKg / DECLARED_TO_BASE[target];
    return {
      declaredQuantity,
      massKg,
      description: `${prefix}${fmt(massKg)} kg${target === "t" ? ` = ${fmt(declaredQuantity)} t` : ""}`,
      error: null,
    };
  }
  if (targetDimension === "volume") {
    if (!factor.densityKgM3) return fail("This factor is per m3 and has no density to convert from mass");
    const declaredQuantity = massKg / factor.densityKgM3;
    return {
      declaredQuantity,
      massKg,
      description: `${prefix}${fmt(massKg)} kg ÷ ${fmt(factor.densityKgM3)} kg/m3 = ${fmt(declaredQuantity)} m3`,
      error: null,
    };
  }
  if (factor.kgPerDeclaredUnit) {
    const declaredQuantity = massKg / factor.kgPerDeclaredUnit;
    return {
      declaredQuantity,
      massKg,
      description: `${prefix}${fmt(massKg)} kg ÷ ${fmt(factor.kgPerDeclaredUnit)} kg/${target} = ${fmt(declaredQuantity)} ${target}`,
      error: null,
    };
  }
  return fail(`This factor is per ${target} and cannot be reached from ${unit.unit}`);
}
