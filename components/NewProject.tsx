"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImportDialog } from "@/components/ImportDialog";
import { autoMapping, BomParseError, missingFields, readCsvTable, tableToLines, type ColumnMapping, type RawTable } from "@/lib/bom/parse";
import { readXlsxTable } from "@/lib/bom/xlsx";
import { catalogue } from "@/lib/catalogue";
import { actions } from "@/lib/store";
import { Icon } from "./Icon";

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
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);

  function create({ table, mapping, file, kind }: PendingImport) {
    const lines = tableToLines(table, mapping, file, kind, catalogue);
    const id = actions.createProject({ name: nameFromFile(file), document: { file, provenance: PROVENANCE }, lines });
    router.push(`/project/${id}/lines`);
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
    <section className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="card group flex flex-col items-start gap-4 p-6 text-left transition-shadow hover:shadow-md"
      >
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand-soft-ink">
          <Icon name="upload" size={20} />
        </span>
        <span>
          <span className="block text-base font-semibold">Upload a bill of materials</span>
          <span className="mt-1 block text-sm text-ink-2">
            CSV or XLSX, read in your browser. Needs description, quantity and unit; section, kg per unit and unit price are optional.
          </span>
        </span>
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand">
          Choose a file <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept=".csv,.xlsx,text/csv"
        className="sr-only"
        tabIndex={-1}
        aria-label="Upload a CSV or XLSX bill of materials"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await read(f);
          e.target.value = "";
        }}
      />
      <div className="card flex flex-col gap-4 p-6">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-ink-2">
          <Icon name="wind" size={20} />
        </span>
        <div>
          <h3 className="text-base font-semibold">Try the demo</h3>
          <p className="mt-1 text-sm text-ink-2">An onshore wind turbine foundation and a small substation, 25 lines. Synthetic data.</p>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          <button
            className="btn btn-primary"
            onClick={async () => {
              const res = await fetch("/demo/wind-foundation.csv");
              await read({ name: "wind-foundation.csv", text: await res.text() });
            }}
          >
            Load demo
          </button>
          <a className="btn btn-ghost" href="/demo/wind-foundation.csv" download>
            <Icon name="download" size={15} /> CSV
          </a>
        </div>
      </div>
      {error && <p className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad md:col-span-2">{error}</p>}
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
