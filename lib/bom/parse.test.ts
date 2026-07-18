import { describe, expect, it } from "vitest";
import { catalogue } from "@/lib/catalogue";
import { BomParseError, fieldForHeader, parseCsv, parseNumber } from "./parse";

describe("parseNumber", () => {
  it("reads English and German number formats", () => {
    expect(parseNumber("1,234.5")).toBe(1234.5);
    expect(parseNumber("1.234,5")).toBe(1234.5);
    expect(parseNumber("3,2")).toBe(3.2);
    expect(parseNumber("12 500")).toBe(12500);
    expect(parseNumber(42)).toBe(42);
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
      id: "csv-2",
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
    expect(first.source).toMatchObject({ kind: "csv", file: "test.csv", ref: "Row 2" });
    expect(first.source.snippet).toContain("Foundation slab concrete C30/37");
  });

  it("names the missing column", () => {
    expect(() => parseCsv("item,amount\nconcrete,5", "x.csv", catalogue)).toThrow(BomParseError);
    expect(() => parseCsv("item,amount\nconcrete,5", "x.csv", catalogue)).toThrow(/"unit"/);
  });

  it("refuses a file with no data rows", () => {
    expect(() => parseCsv("description,quantity,unit\n", "x.csv", catalogue)).toThrow(/header row/);
  });
});
