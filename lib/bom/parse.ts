import Papa from "papaparse";
import { capConfidence, matchFactor, type BomLine, type Catalogue, type LineSource } from "@/lib/engine";

export type BomField = "description" | "quantity" | "unit" | "kgPerUnit" | "densityKgM3" | "unitPriceEur" | "section";

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
  let s = raw.trim().replace(/[\s\u00a0']/g, "");
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

export function rowsToLines(
  headers: string[],
  rows: unknown[][],
  file: string,
  kind: "csv" | "xlsx",
  catalogue: Catalogue,
  decimalComma = false,
): BomLine[] {
  const columns = headers.map(fieldForHeader);
  for (const required of REQUIRED_FIELDS) {
    if (!columns.includes(required)) {
      throw new BomParseError(`Missing a "${required}" column. Found: ${headers.join(", ")}`);
    }
  }
  const lines: BomLine[] = [];
  rows.forEach((row, index) => {
    const record: Partial<Record<BomField, unknown>> = {};
    columns.forEach((field, c) => {
      if (field) record[field] = row[c];
    });
    const description = String(record.description ?? "").trim();
    if (!description) return;
    const rowNumber = index + 2;
    lines.push(
      lineFromMatch(
        `${kind}-${rowNumber}`,
        {
          description,
          section: record.section ? String(record.section).trim() : undefined,
          quantity: parseNumber(record.quantity, decimalComma),
          unit: String(record.unit ?? "").trim(),
          kgPerUnit: parseNumber(record.kgPerUnit, decimalComma),
          densityKgM3: parseNumber(record.densityKgM3, decimalComma),
          unitPriceEur: parseNumber(record.unitPriceEur, decimalComma),
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

export function parseCsv(text: string, file: string, catalogue: Catalogue): BomLine[] {
  text = text.replace(/^\uFEFF/, ""); // utf-8 BOM from excel
  // Comment lines are skipped, so a file can carry its own "synthetic data" banner.
  const delimiter = guessDelimiter(text);
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy", comments: "#", delimiter });
  if (parsed.data.length < 2) throw new BomParseError("The CSV needs a header row and at least one data row.");
  const [headers, ...rows] = parsed.data;
  return rowsToLines(headers, rows, file, "csv", catalogue, delimiter === ";");
}
