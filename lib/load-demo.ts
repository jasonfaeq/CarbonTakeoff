"use client";

import windSpec from "@/demo/cache/wind-spec.json";
import { autoMapping, readCsvTable, tableToLines } from "@/lib/bom/parse";
import { catalogue } from "@/lib/catalogue";
import type { Demo } from "@/lib/demos";
import { extractedToBomLines, type ExtractedLine } from "@/lib/extract/lines";
import { actions } from "@/lib/store";

interface SpecCache {
  provenance: string;
  file: string;
  kind: "pdf" | "text";
  pagesScanned: number;
  pagesSent: number;
  pages: Record<string, string>;
  lines: ExtractedLine[];
}

/** Cached extractions of the specification demos, built by scripts/build-demo-cache.ts. */
const SPEC_CACHES: Record<string, SpecCache> = {
  "wind-spec": windSpec as SpecCache,
};

/** Fetch or read a demo and save it as a new project, the same way an upload would. Returns the project id. */
export async function loadDemo(demo: Demo): Promise<string> {
  if (demo.kind === "spec") {
    const cache = SPEC_CACHES[demo.id];
    const pages = Object.fromEntries(Object.entries(cache.pages).map(([n, text]) => [Number(n), text]));
    const lines = extractedToBomLines(cache.lines, pages, cache.file, cache.kind, catalogue);
    return actions.createProject({
      name: demo.title,
      document: { file: cache.file, provenance: cache.provenance, pagesScanned: cache.pagesScanned, pagesSent: cache.pagesSent },
      lines,
      autoAcceptHigh: false,
    });
  }
  const text = await (await fetch(demo.file)).text();
  const table = readCsvTable(text);
  const file = demo.file.split("/").pop()!;
  const lines = tableToLines(table, autoMapping(table.headers), file, "csv", catalogue);
  return actions.createProject({ name: demo.title, document: { file, provenance: "Synthetic demo data, parsed in your browser." }, lines });
}
