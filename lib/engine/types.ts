export type DeclaredUnit = "kg" | "t" | "m3" | "m2" | "m";
/** PLACEHOLDER: synthetic development value, never a real estimate. */
export type FactorStatus = "VERIFIED" | "UNVERIFIED" | "PLACEHOLDER";
export type Applicability = "direct" | "proxy";
export type LineStatus = "pending" | "accepted" | "rejected";

/** An emission factor, with enough provenance to check the number by hand. */
export interface Factor {
  id: string;
  name: string;
  group: string;
  value: number;
  /** Display unit, e.g. "kg CO2e/m3". */
  unit: string;
  /** The unit the value is declared per. Line quantities are converted into it. */
  declaredUnit: DeclaredUnit;
  scope: string;
  /** Short label for the UI, e.g. "DESNZ 2026". */
  source: string;
  sourceName: string;
  tableRow: string;
  versionYear: string;
  licence: string;
  url: string;
  retrieved: string;
  status: FactorStatus;
  applicability: Applicability;
  /** Lower-carbon factors from the same source. */
  alternatives: string[];
  note: string | null;
  densityKgM3?: number;
  densitySource?: string;
  /** For factors declared per m or m2: the mass of one declared unit. */
  kgPerDeclaredUnit?: number;
}

export interface LineSource {
  kind: "csv" | "xlsx" | "pdf" | "text" | "manual";
  file: string;
  /** Where in the file: "Row 4", "Page 2". */
  ref: string;
  /** The original text, so a reviewer can check the line against it. */
  snippet: string;
}

export interface BomLine {
  id: string;
  section?: string;
  description: string;
  quantity: number | null;
  unit: string;
  /** kg per BOM unit, for lines measured in m or m2 (cable kg/m, membrane kg/m2). */
  kgPerUnit?: number | null;
  densityKgM3?: number | null;
  unitPriceEur?: number | null;
  factorId: string | null;
  /** 0 to 1. */
  confidence: number;
  matchReason: string;
  status: LineStatus;
  /** Spend commodity (NAICS), for lines whose commodity can't be read from the factor. */
  naics?: string | null;
  source: LineSource;
}

export interface SpendFactor {
  naics: string;
  title: string;
  /** kg CO2e per USD at purchaser prices. */
  value: number;
  unit: string;
}

export interface SpendData {
  source: { sourceName: string; tableRow: string; versionYear: string; licence: string; url: string; retrieved: string };
  fx: { usdPerEur: number; year: number; sourceName: string; url: string; retrieved: string };
  /** Activity factor id to the NAICS commodity it is bought as. */
  factorToNaics: Record<string, string>;
  factors: SpendFactor[];
}
