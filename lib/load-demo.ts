"use client";

import { autoMapping, readCsvTable, tableToLines } from "@/lib/bom/parse";
import { catalogue } from "@/lib/catalogue";
import type { Demo } from "@/lib/demos";
import { actions } from "@/lib/store";

/** Fetch a demo's file, parse it like an upload and save it as a new project. Returns the project id. */
export async function loadDemo(demo: Demo): Promise<string> {
  const text = await (await fetch(demo.file)).text();
  const table = readCsvTable(text);
  const file = demo.file.split("/").pop()!;
  const lines = tableToLines(table, autoMapping(table.headers), file, "csv", catalogue);
  return actions.createProject({ name: demo.title, document: { file, provenance: "Synthetic demo data, parsed in your browser." }, lines });
}
