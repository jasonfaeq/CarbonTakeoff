import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/bom/parse";
import { catalogue } from "@/lib/catalogue";
import { DEMOS } from "@/lib/demos";
import { snippetOnPage } from "@/lib/extract/pages";
import type { ExtractedLine } from "@/lib/extract/lines";

describe("demo projects", () => {
  for (const demo of DEMOS.filter((d) => d.kind === "bom")) {
    it(`${demo.id} parses, says it is synthetic and matches most lines`, () => {
      const text = readFileSync(`public${demo.file}`, "utf8");
      expect(text.split("\n")[0]).toMatch(/SYNTHETIC/);
      const lines = parseCsv(text, demo.file, catalogue);
      expect(lines.length).toBeGreaterThan(10);
      expect(lines.filter((l) => l.factorId).length / lines.length).toBeGreaterThan(0.75);
    });
  }

  for (const demo of DEMOS.filter((d) => d.kind === "spec")) {
    it(`${demo.id} has a cache whose quotes are all on their pages`, () => {
      const cache = JSON.parse(readFileSync(`demo/cache/${demo.id}.json`, "utf8")) as { pages: Record<string, string>; lines: ExtractedLine[] };
      for (const line of cache.lines) {
        expect(snippetOnPage(line.source_snippet, cache.pages[line.page]), line.source_snippet).toBe(true);
        if (line.suggested_factor_id) expect(catalogue.byId.has(line.suggested_factor_id), line.suggested_factor_id).toBe(true);
      }
    });
  }
});
