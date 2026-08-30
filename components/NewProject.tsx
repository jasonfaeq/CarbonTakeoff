"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImportDialog } from "@/components/ImportDialog";
import { autoMapping, BomParseError, missingFields, readCsvTable, tableToLines, type ColumnMapping, type RawTable } from "@/lib/bom/parse";
import { readXlsxTable } from "@/lib/bom/xlsx";
import { catalogue } from "@/lib/catalogue";
import { actions } from "@/lib/store";

const PROVENANCE = "Parsed and rule-matched in your browser. The file was not uploaded.";

interface PendingImport {
  table: RawTable;
  mapping: ColumnMapping;
  file: string;
  kind: "csv" | "xlsx";
}

function nameFromFile(file: string) {
  const base = file.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ");
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function NewProject() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);

  function create({ table, mapping, file, kind }: PendingImport) {
    const lines = tableToLines(table, mapping, file, kind, catalogue);
    const id = actions.createProject({ name: nameFromFile(file), document: { file, provenance: PROVENANCE }, lines });
    router.push(`/project/${id}`);
  }

  async function read(file: File | { name: string; text: string }) {
    setError(null);
    setPending(null);
    try {
      const kind = /\.xlsx$/i.test(file.name) ? "xlsx" : "csv";
      const table =
        file instanceof File && kind === "xlsx" ? await readXlsxTable(file) : readCsvTable(file instanceof File ? await file.text() : file.text);
      const next = { table, mapping: autoMapping(table.headers), file: file.name, kind } as const;
      if (missingFields(next.mapping).length > 0) setPending(next);
      else create(next);
    } catch (e) {
      setError(e instanceof BomParseError ? e.message : "This file could not be read. Upload a CSV or XLSX file.");
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="font-medium">New project</h2>
      <p className="mt-1 text-sm text-zinc-500">Columns: description, quantity, unit. Optional: section, kg_per_unit, unit_price_eur.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
          Upload CSV or XLSX
          <input
            type="file"
            accept=".csv,.xlsx,text/csv"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await read(f);
              e.target.value = "";
            }}
          />
        </label>
        <button
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          onClick={async () => {
            const res = await fetch("/demo/wind-foundation.csv");
            await read({ name: "wind-foundation.csv", text: await res.text() });
          }}
        >
          Load the wind foundation demo
        </button>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {pending && (
        <ImportDialog
          table={pending.table}
          initial={pending.mapping}
          fileName={pending.file}
          onCancel={() => setPending(null)}
          onImport={(mapping) => {
            setPending(null);
            create({ ...pending, mapping });
          }}
        />
      )}
    </section>
  );
}
