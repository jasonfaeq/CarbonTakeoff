import { describe, expect, it } from "vitest";
import { catalogue } from "@/lib/catalogue";
import { extractedToBomLines, type ExtractedLine } from "./lines";
import { scorePage, selectPages, snippetOnPage } from "./pages";
import { textPages } from "./pdf";

function extracted(overrides: Partial<ExtractedLine> = {}): ExtractedLine {
  return {
    material: "Concrete",
    description: "Slab concrete C30/37",
    quantity: 620,
    unit: "m3",
    page: 3,
    source_snippet: "620 m3 of C30/37 concrete",
    confidence: 0.95,
    suggested_factor_id: "concrete-c30-37",
    kg_per_unit: null,
    unit_price_eur: null,
    ...overrides,
  };
}

describe("extracted lines to review lines", () => {
  const pages = { 3: "the slab takes 620 m3 of C30/37 concrete in one pour" };

  it("are always pending, with the lower of the model's and the rules' confidence", () => {
    const [line] = extractedToBomLines([extracted()], pages, "s.pdf", "pdf", catalogue);
    expect(line.status).toBe("pending");
    expect(line.factorId).toBe("concrete-c30-37");
    expect(line.confidence).toBeCloseTo(0.9);
    expect(line.source).toMatchObject({ kind: "pdf", ref: "Page 3" });
  });

  it("flag a quote that is not on its stated page", () => {
    const [line] = extractedToBomLines([extracted({ source_snippet: "999 m3 of invented concrete" })], pages, "s.pdf", "pdf", catalogue);
    expect(line.confidence).toBeLessThanOrEqual(0.3);
    expect(line.matchReason).toMatch(/not found on page 3/);
  });

  it("take the AI's factor at medium confidence at most when the rules disagree", () => {
    const [line] = extractedToBomLines([extracted({ suggested_factor_id: "concrete-rc-c30-37" })], pages, "s.pdf", "pdf", catalogue);
    expect(line.factorId).toBe("concrete-rc-c30-37");
    expect(line.confidence).toBeLessThanOrEqual(0.6);
  });

  it("ignore a suggested factor that does not exist", () => {
    const [line] = extractedToBomLines([extracted({ suggested_factor_id: "unobtainium" })], pages, "s.pdf", "pdf", catalogue);
    expect(line.factorId).toBe("concrete-c30-37");
  });
});

describe("page selection", () => {
  const quantities = "620 m3 of C30/37 concrete and 78 t of reinforcing steel and 400 kg of grout";

  it("scores quantity pages above prose", () => {
    expect(scorePage(quantities)).toBeGreaterThan(scorePage("The Contractor shall keep the site tidy."));
  });

  it("selects by score, keeps document order and caps the count", () => {
    const pages = ["general conditions", quantities, "payment terms", quantities];
    expect(selectPages(pages)).toMatchObject({ pagesScanned: 4, selected: [2, 4] });
    expect(selectPages(pages, 1).selected).toHaveLength(1);
  });

  it("matches a quote whatever its whitespace and case", () => {
    expect(snippetOnPage("620 M3 of\nC30/37", quantities)).toBe(true);
    expect(snippetOnPage("621 m3", quantities)).toBe(false);
    expect(snippetOnPage("", quantities)).toBe(false);
  });

  it("cuts plain text into pages without losing a character", () => {
    const text = "line of text\n".repeat(1000);
    const pages = textPages(text, 1000);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.join("")).toBe(text);
  });
});
