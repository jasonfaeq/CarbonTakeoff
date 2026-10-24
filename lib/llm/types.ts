import type { ExtractedLine } from "@/lib/extract/lines";

export interface ExtractionRequest {
  /** Only the selected pages, keyed by their real page number. */
  pages: { page: number; text: string }[];
  catalogue: { id: string; name: string; unit: string }[];
}

export interface ExtractionResult {
  lines: ExtractedLine[];
  model: string;
}

/** The one seam between the app and an LLM vendor. */
export interface LlmProvider {
  name: string;
  extract(request: ExtractionRequest): Promise<ExtractionResult>;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly userMessage: string,
  ) {
    super(message);
  }
}

export const RECORD_TOOL_NAME = "record_materials";

/** JSON schema for the one tool call. suggested_factor_id is limited to catalogue ids or null. */
export function extractionInputSchema(factorIds: string[]) {
  return {
    type: "object" as const,
    additionalProperties: false,
    required: ["lines"],
    properties: {
      lines: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "material",
            "description",
            "quantity",
            "unit",
            "page",
            "source_snippet",
            "confidence",
            "suggested_factor_id",
            "kg_per_unit",
            "unit_price_eur",
            "section",
          ],
          properties: {
            material: { type: "string", description: "Short material name, e.g. reinforcing steel." },
            description: { type: "string", description: "The item as a BOM line, including grade or class." },
            quantity: { type: ["number", "null"], description: "As stated. Null if the document gives no number." },
            unit: { type: "string", description: "As stated: m3, t, kg, m, m2, pcs." },
            page: { type: "integer", description: "The page number the quantity is on." },
            source_snippet: { type: "string", description: "Exact text copied from that page, under 200 characters." },
            confidence: { type: "number", description: "0 to 1: how sure you are of this quantity and unit." },
            suggested_factor_id: {
              anyOf: [{ type: "string", enum: factorIds }, { type: "null" }],
              description: "The closest catalogue factor, or null if none fits.",
            },
            kg_per_unit: { type: ["number", "null"], description: "Mass per metre or per m2, only if the document states it." },
            unit_price_eur: { type: ["number", "null"], description: "Unit price in EUR, only if the document states it." },
            section: { type: ["string", "null"], description: "The document's heading for the work package, if there is one." },
          },
        },
      },
    },
  };
}

/** Never trust a tool input, even from a strict tool: check it before it reaches the UI. */
export function validateExtractedLines(input: unknown, factorIds: Set<string>): ExtractedLine[] {
  if (typeof input !== "object" || input === null || !Array.isArray((input as { lines?: unknown }).lines)) {
    throw new LlmError("Tool input has no lines array", "The AI response could not be read. Try again.");
  }
  const lines: ExtractedLine[] = [];
  for (const raw of (input as { lines: unknown[] }).lines) {
    const r = raw as Record<string, unknown>;
    if (typeof r?.description !== "string" || typeof r.unit !== "string" || typeof r.page !== "number") continue;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const suggested = typeof r.suggested_factor_id === "string" ? r.suggested_factor_id : null;
    lines.push({
      material: typeof r.material === "string" ? r.material : "",
      description: r.description,
      quantity: num(r.quantity),
      unit: r.unit,
      page: r.page,
      source_snippet: typeof r.source_snippet === "string" ? r.source_snippet : "",
      confidence: num(r.confidence) ?? 0,
      suggested_factor_id: suggested && factorIds.has(suggested) ? suggested : null,
      kg_per_unit: num(r.kg_per_unit),
      unit_price_eur: num(r.unit_price_eur),
      section: typeof r.section === "string" ? r.section : null,
    });
  }
  return lines;
}
