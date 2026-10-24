import { lineFromMatch } from "@/lib/bom/parse";
import { capConfidence, normaliseUnit, type BomLine, type Catalogue } from "@/lib/engine";
import { snippetOnPage } from "./pages";

/** The shape the LLM returns, and the shape of a cached demo extraction. */
export interface ExtractedLine {
  material: string;
  description: string;
  quantity: number | null;
  unit: string;
  page: number;
  source_snippet: string;
  confidence: number;
  suggested_factor_id: string | null;
  kg_per_unit: number | null;
  unit_price_eur: number | null;
  section?: string | null;
}

/** A quote that is not on its stated page may be invented, so the line drops to the bottom of the range. */
export const UNVERIFIED_QUOTE_CONFIDENCE = 0.3;

/**
 * Turn extracted lines into review lines. All come back pending: extraction never goes
 * straight into a total. Confidence is the lower of the model's and the rules', and a quote
 * that cannot be found on its page is flagged.
 */
export function extractedToBomLines(
  extracted: ExtractedLine[],
  pages: Record<number, string> | null,
  file: string,
  kind: "pdf" | "text",
  catalogue: Catalogue,
): BomLine[] {
  return extracted.map((item, i) => {
    const suggestion = item.suggested_factor_id && catalogue.byId.has(item.suggested_factor_id) ? item.suggested_factor_id : null;
    const line = lineFromMatch(
      `${kind}-${i + 1}`,
      {
        description: item.description,
        section: item.section ?? undefined,
        quantity: item.quantity,
        unit: normaliseUnit(item.unit)?.unit ?? item.unit,
        kgPerUnit: item.kg_per_unit,
        unitPriceEur: item.unit_price_eur,
      },
      { kind, file, ref: `Page ${item.page}`, snippet: item.source_snippet },
      catalogue,
    );
    const modelConfidence = Math.max(0, Math.min(1, item.confidence));
    let confidence: number;
    if (suggestion && suggestion === line.factorId) {
      confidence = Math.min(modelConfidence, line.confidence);
      line.matchReason = `AI and rules agree. ${line.matchReason}`;
    } else if (suggestion) {
      confidence = Math.min(modelConfidence, 0.6);
      line.factorId = suggestion;
      line.matchReason = "AI suggestion; the keyword rules disagree or found nothing";
    } else {
      confidence = Math.min(modelConfidence, line.confidence);
    }
    line.confidence = capConfidence(confidence, line.factorId, catalogue);
    if (pages && !snippetOnPage(item.source_snippet, pages[item.page])) {
      line.confidence = Math.min(line.confidence, UNVERIFIED_QUOTE_CONFIDENCE);
      line.matchReason = `Quoted text not found on page ${item.page}: check the source. ${line.matchReason}`;
    }
    return line;
  });
}
