import { describe, expect, it } from "vitest";
import { catalogue } from "@/lib/catalogue";
import { autoMapping, BomParseError, fieldForHeader, missingFields, parseCsv, parseNumber, readCsvTable, sheetToTable, tableToLines } from "./parse";

describe("parseNumber", () => {
  it("reads English and German number formats", () => {
    expect(parseNumber("1,234.5")).toBe(1234.5);
    expect(parseNumber("1.234,5")).toBe(1234.5);
    expect(parseNumber("3,2")).toBe(3.2);
    expect(parseNumber("12 500")).toBe(12500);
    expect(parseNumber(42)).toBe(42);
    expect(parseNumber("1.250", true)).toBe(1250);
  });

  it("returns null for blanks and words", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("approx.")).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
    expect(parseNumber(Number.NaN)).toBeNull();
  });
});

describe("fieldForHeader", () => {
  it("knows common and German header names", () => {
    expect(fieldForHeader(" Qty ")).toBe("quantity");
    expect(fieldForHeader("Bezeichnung")).toBe("description");
    expect(fieldForHeader("Einheit")).toBe("unit");
    expect(fieldForHeader("unit_price_eur")).toBe("unitPriceEur");
    expect(fieldForHeader("colour")).toBeNull();
  });
});

describe("parseCsv", () => {
  const csv = [
    "# synthetic test file",
    "section,description,quantity,unit,kg_per_unit,unit_price_eur",
    "Foundation,Foundation slab concrete C30/37,640,m3,,135",
    "Cabling,MV cable aluminium conductor,1800,m,1.95,28",
    ",,,,,",
    "Foundation,Reinforcing steel B500B,82,t,,980",
  ].join("\n");

  it("turns rows into matched, pending lines", () => {
    const lines = parseCsv(csv, "test.csv", catalogue);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({
      id: "csv-3",
      section: "Foundation",
      quantity: 640,
      unit: "m3",
      unitPriceEur: 135,
      factorId: "concrete-c30-37",
      status: "pending",
    });
    expect(lines[1].kgPerUnit).toBe(1.95);
  });

  it("keeps a reference back to the source row", () => {
    const [first] = parseCsv(csv, "test.csv", catalogue);
    expect(first.source).toMatchObject({ kind: "csv", file: "test.csv", ref: "Row 3" });
    expect(first.source.snippet).toContain("Foundation slab concrete C30/37");
  });

  it("reads a semicolon csv from excel (german), with BOM and decimal commas", () => {
    const de = "\uFEFFBezeichnung;Menge;Einheit;Preis\nBeton C30/37;12,5;m3;135,50\nBetonstahl B500B;1.250;kg;1,05\n";
    const lines = parseCsv(de, "de.csv", catalogue);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ quantity: 12.5, unitPriceEur: 135.5, factorId: "concrete-c30-37" });
    expect(lines[1].quantity).toBe(1250);
  });

  it("keeps row numbers in step with the file across blank rows", () => {
    const lines = parseCsv(csv, "test.csv", catalogue);
    expect(lines[2].source.ref).toBe("Row 6");
  });

  it("names the missing column", () => {
    expect(() => parseCsv("item,amount\nconcrete,5", "x.csv", catalogue)).toThrow(BomParseError);
    expect(() => parseCsv("item,amount\nconcrete,5", "x.csv", catalogue)).toThrow(/"unit"/);
  });

  it("refuses a file with no data rows", () => {
    expect(() => parseCsv("description,quantity,unit\n", "x.csv", catalogue)).toThrow(/header row/);
  });
});

describe("column mapping", () => {
  it("maps known headers and leaves the rest for a person", () => {
    const mapping = autoMapping(["Pos", "Item", "Qty", "UoM", "Notes"]);
    expect(mapping).toEqual([null, "description", "quantity", "unit", null]);
    expect(missingFields(mapping)).toEqual([]);
    expect(missingFields(autoMapping(["Pos", "Text", "Menge"]))).toEqual(["description", "unit"]);
  });

  it("uses a mapping chosen by hand", () => {
    const table = readCsvTable(["Pos,Text,Qty,Measure", "1,Gravel 2/32,180,t"].join("\n"));
    const lines = tableToLines(table, [null, "description", "quantity", "unit"], "x.csv", "csv", catalogue);
    expect(lines[0]).toMatchObject({ description: "Gravel 2/32", quantity: 180, unit: "t", factorId: "gravel" });
  });

  it("finds the header row of a sheet below a title block", () => {
    const table = sheetToTable([["Project BOM"], [], ["Description", "Quantity", "Unit"], ["Sand 0/2", 40, "t"]]);
    expect(table.headers).toEqual(["Description", "Quantity", "Unit"]);
    expect(table.headerRow).toBe(3);
    const [line] = tableToLines(table, autoMapping(table.headers), "x.xlsx", "xlsx", catalogue);
    expect(line.source.ref).toBe("Row 4");
    expect(line.quantity).toBe(40);
  });
});
