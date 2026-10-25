// Builds demo/cache/<id>.json for each specification demo. Run: npm run demo:cache
// Page counts come from the real pipeline (text per page, then page selection), the lines from a
// hand-written extraction next to it. Every quoted snippet is checked against its page, and the
// build fails if one is missing, so a cached quote can't drift away from the document.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { ExtractedLine } from "../lib/extract/lines";
import { selectPages, snippetOnPage } from "../lib/extract/pages";
import { pdfPages, textPages } from "../lib/extract/pdf";

interface SpecDemo {
  id: string;
  /** The document as served from public/. */
  source: string;
  manual: string;
}

const SPECS: SpecDemo[] = [
  { id: "wind-spec", source: "public/demo/wind-spec.pdf", manual: "demo/wind-spec.manual.json" },
  { id: "water-main", source: "public/demo/water-main-spec.txt", manual: "demo/water-main.manual.json" },
];

const PROVENANCE =
  "Manual extraction, written by hand for this demo so it works without an API key. Not LLM output. Same schema as live extraction, and every quote was machine-checked against the document.";

async function build(spec: SpecDemo) {
  const isPdf = spec.source.endsWith(".pdf");
  const pages = isPdf ? await pdfPages(new Uint8Array(readFileSync(spec.source))) : textPages(readFileSync(spec.source, "utf8"));
  const selection = selectPages(pages);
  const lines: ExtractedLine[] = JSON.parse(readFileSync(spec.manual, "utf8"));

  const missing = lines.filter((l) => !snippetOnPage(l.source_snippet, pages[l.page - 1]));
  if (missing.length) {
    for (const l of missing) console.error(`Not on page ${l.page}: "${l.source_snippet}"\n  page text: ${pages[l.page - 1]?.slice(0, 1500)}`);
    throw new Error(`${spec.id}: ${missing.length} quotes are not on their stated page`);
  }
  const offSelection = lines.filter((l) => !selection.selected.includes(l.page));
  if (offSelection.length) throw new Error(`${spec.id}: page selection misses pages holding lines: ${offSelection.map((l) => l.page).join(", ")}`);

  const file = spec.source.split("/").pop()!;
  writeFileSync(
    `demo/cache/${spec.id}.json`,
    JSON.stringify(
      {
        provenance: PROVENANCE,
        file,
        kind: isPdf ? "pdf" : "text",
        pagesScanned: selection.pagesScanned,
        pagesSent: selection.selected.length,
        pages: Object.fromEntries(selection.selected.map((p) => [p, pages[p - 1]])),
        lines,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `${spec.id}: ${lines.length} lines, pages ${selection.selected.join(",")} of ${selection.pagesScanned} (scores ${selection.scores.join(",")})`,
  );
}

async function main() {
  mkdirSync("demo/cache", { recursive: true });
  for (const spec of SPECS) await build(spec);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
