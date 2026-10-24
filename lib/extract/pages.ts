/** Narrow a long document down to the pages likely to hold material quantities. */

export const MAX_PAGES_TO_LLM = 12;
const MIN_SCORE = 4;

const MATERIAL =
  /concrete|beton|c\s?\d{2}\/\d{2}|rebar|reinforc|bewehr|steel|stahl|copper|kupfer|alumin|cable|kabel|cement|zement|grout|mortar|screed|aggregate|gravel|crushed|backfill|geotextile|pvc|hdpe|duct|pipe|bitumen|asphalt|epoxy|timber|glulam|clt|formwork|brick|block|insulation|plasterboard|glass|glazing|membrane|transformer|battery/gi;
const QUANTITY = /\d[\d.,]*\s?(?:m3|m³|m2|m²|t\b|tonnes?\b|kg\b|km\b|lm\b|m\b)/gi;

export function scorePage(text: string): number {
  const materials = text.match(MATERIAL)?.length ?? 0;
  const quantities = text.match(QUANTITY)?.length ?? 0;
  // A quantity counts for more than a mention: general conditions name materials too.
  return materials + quantities * 2;
}

export interface PageSelection {
  pagesScanned: number;
  /** 1-based page numbers, in document order. */
  selected: number[];
  scores: number[];
}

export function selectPages(pages: string[], maxPages = MAX_PAGES_TO_LLM): PageSelection {
  const scores = pages.map(scorePage);
  const selected = scores
    .map((score, i) => ({ score, page: i + 1 }))
    .filter((p) => p.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPages)
    .map((p) => p.page)
    .sort((a, b) => a - b);
  return { pagesScanned: pages.length, selected, scores };
}

function squash(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Did the model (or a person) quote text that really is on that page? */
export function snippetOnPage(snippet: string, pageText: string | undefined): boolean {
  if (!pageText || !snippet.trim()) return false;
  return squash(pageText).includes(squash(snippet));
}
