import Papa from "papaparse";
import { capConfidence, matchFactor, type BomLine, type Catalogue, type LineSource } from "@/lib/engine";

export type BomField = "description" | "quantity" | "unit" | "kgPerUnit" | "densityKgM3" | "unitPriceEur" | "section";

export const FIELD_LABELS: Record<BomField, string> = {
  description: "Description",
  quantity: "Quantity",
  unit: "Unit",
  kgPerUnit: "kg per unit (m, m²)",
  densityKgM3: "Density (kg/m³)",
  unitPriceEur: "Unit price (EUR)",
  section: "Section",
};

const HEADER_ALIASES: Record<BomField, string[]> = {
  description: ["description", "item", "material", "bezeichnung", "beschreibung", "position text", "name"],
  quantity: ["quantity", "qty", "menge", "amount"],
  unit: ["unit", "uom", "einheit"],
  kgPerUnit: ["kg_per_unit", "kg/unit", "kg per unit", "kg/m", "kg per m", "kg/m2", "kg_per_m"],
  densityKgM3: ["density_kg_m3", "density", "kg/m3", "dichte"],
  unitPriceEur: ["unit_price_eur", "unit price eur", "unit price", "price", "eur/unit", "preis", "einheitspreis"],
  section: ["section", "package", "gewerk", "group", "area"],
};

export const REQUIRED_FIELDS: BomField[] = ["description", "quantity", "unit"];

export function fieldForHeader(header: string): BomField | null {
  const key = header.trim().toLowerCase();
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [BomField, string[]][]) {
    if (aliases.includes(key)) return field;
  }
  return null;
}

/**
 * Accepts 1,234.5 and 1.234,5 and plain numbers. Returns null for anything else.
 * decimalComma: the file uses , for decimals (semicolon csv), so 1.250 means 1250 not 1.25
 */
export function parseNumber(raw: unknown, decimalComma = false): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  // \s covers no-break spaces too, which Excel likes to put in thousands.
  let s = raw.trim().replace(/[\s']/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (decimalComma || lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export class BomParseError extends Error {}

export function lineFromMatch(
  id: string,
  fields: Partial<BomLine> & { description: string; quantity: number | null; unit: string },
  source: LineSource,
  catalogue: Catalogue,
): BomLine {
  const match = matchFactor(fields.description);
  return {
    id,
    status: "pending",
    factorId: match.factorId,
    confidence: capConfidence(match.confidence, match.factorId, catalogue),
    matchReason: match.reason,
    naics: match.naics,
    source,
    ...fields,
  };
}

/** A table as read from a file, before anyone has said which column is which. */
export interface RawTable {
  headers: string[];
  rows: unknown[][];
  /** 1-based row number of the header in the file, so refs point at the real row. */
  headerRow: number;
  decimalComma: boolean;
}

/** Which field each column holds, by column index. */
export type ColumnMapping = (BomField | null)[];

export function autoMapping(headers: string[]): ColumnMapping {
  const seen = new Set<BomField>();
  return headers.map((h) => {
    const field = fieldForHeader(h);
    if (!field || seen.has(field)) return null;
    seen.add(field);
    return field;
  });
}

export function missingFields(mapping: ColumnMapping): BomField[] {
  return REQUIRED_FIELDS.filter((f) => !mapping.includes(f));
}

export function tableToLines(table: RawTable, mapping: ColumnMapping, file: string, kind: "csv" | "xlsx", catalogue: Catalogue): BomLine[] {
  const missing = missingFields(mapping);
  if (missing.length > 0) {
    throw new BomParseError(`Missing a "${missing[0]}" column. Found: ${table.headers.join(", ")}`);
  }
  const num = (v: unknown) => parseNumber(v, table.decimalComma);
  const lines: BomLine[] = [];
  table.rows.forEach((row, index) => {
    const record: Partial<Record<BomField, unknown>> = {};
    mapping.forEach((field, c) => {
      if (field) record[field] = row[c];
    });
    const description = String(record.description ?? "").trim();
    if (!description) return;
    const rowNumber = table.headerRow + index + 1;
    lines.push(
      lineFromMatch(
        `${kind}-${rowNumber}`,
        {
          description,
          section: record.section ? String(record.section).trim() : undefined,
          quantity: num(record.quantity),
          unit: String(record.unit ?? "").trim(),
          kgPerUnit: num(record.kgPerUnit),
          densityKgM3: num(record.densityKgM3),
          unitPriceEur: num(record.unitPriceEur),
        },
        {
          kind,
          file,
          ref: `Row ${rowNumber}`,
          snippet: row
            .map((c) => String(c ?? ""))
            .filter(Boolean)
            .join(" | "),
        },
        catalogue,
      ),
    );
  });
  if (lines.length === 0) throw new BomParseError("No data rows found.");
  return lines;
}

/** excel in a german locale saves "csv" with ; and decimal commas, and papa's guesser sometimes picks the comma */
function guessDelimiter(text: string): string {
  const header = text.split(/\r?\n/).find((l) => l.trim() && !l.startsWith("#")) ?? "";
  const count = (c: string) => header.split(c).length - 1;
  const best = [",", ";", "\t"].sort((a, b) => count(b) - count(a))[0];
  return count(best) > 0 ? best : ",";
}

export function readCsvTable(text: string): RawTable {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // utf-8 BOM from excel
  const delimiter = guessDelimiter(text);
  // Comment lines are skipped, so a file can carry its own "synthetic data" banner. Empty rows are
  // kept (and ignored later) so row numbers still match the file.
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false, comments: "#", delimiter });
  const [headers = [], ...rows] = parsed.data;
  if (!rows.some((r) => r.some((c) => c.trim()))) throw new BomParseError("The CSV needs a header row and at least one data row.");
  const bannerLines = text.split(/\r?\n/).findIndex((l) => l.trim() && !l.startsWith("#"));
  return { headers, rows, headerRow: Math.max(bannerLines, 0) + 1, decimalComma: delimiter === ";" };
}

/** Header row: the first row with at least three filled cells, so a title block above it is skipped. */
export function sheetToTable(sheet: unknown[][]): RawTable {
  const headerIndex = sheet.findIndex((r) => r.filter((c) => c !== null && c !== undefined && String(c).trim() !== "").length >= 3);
  if (headerIndex < 0) throw new BomParseError("No header row found in the first sheet.");
  return {
    headers: sheet[headerIndex].map((c) => String(c ?? "").trim()),
    rows: sheet.slice(headerIndex + 1),
    headerRow: headerIndex + 1,
    decimalComma: false,
  };
}

export function parseCsv(text: string, file: string, catalogue: Catalogue): BomLine[] {
  const table = readCsvTable(text);
  return tableToLines(table, autoMapping(table.headers), file, "csv", catalogue);
}
