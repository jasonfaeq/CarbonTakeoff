"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImportDialog } from "@/components/ImportDialog";
import { autoMapping, BomParseError, missingFields, readCsvTable, tableToLines, type ColumnMapping, type RawTable } from "@/lib/bom/parse";
import { readXlsxTable } from "@/lib/bom/xlsx";
import { catalogue } from "@/lib/catalogue";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/limits";
import { readProjectFile, ShareError } from "@/lib/share";
import { actions } from "@/lib/store";
import { Icon } from "./Icon";

const PROVENANCE = "Parsed and rule-matched in your browser. The file was not uploaded.";

interface PendingImport {
  table: RawTable;
  mapping: ColumnMapping;
  file: string;
  kind: "csv" | "xlsx";
}

type Notice = { tone: "info" | "error"; text: string } | null;

function nameFromFile(file: string) {
  const base = file.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ");
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function NewProject() {
  const router = useRouter();
  const bomInput = useRef<HTMLInputElement>(null);
  const specInput = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [extracting, setExtracting] = useState(false);

  function create({ table, mapping, file, kind }: PendingImport) {
    const lines = tableToLines(table, mapping, file, kind, catalogue);
    const id = actions.createProject({ name: nameFromFile(file), document: { file, provenance: PROVENANCE }, lines });
    router.push(`/project/${id}/lines`);
  }

  async function read(file: File | { name: string; text: string }) {
    setNotice(null);
    setPending(null);
    if (file instanceof File && file.name.toLowerCase().endsWith(".json")) {
      try {
        const id = actions.importProject(readProjectFile(JSON.parse(await file.text())));
        router.push(`/project/${id}`);
      } catch (e) {
        setNotice({ tone: "error", text: e instanceof ShareError ? e.message : "This JSON file could not be read as a project." });
      }
      return;
    }
    try {
      const kind = /\.xlsx$/i.test(file.name) ? "xlsx" : "csv";
      const table =
        file instanceof File && kind === "xlsx" ? await readXlsxTable(file) : readCsvTable(file instanceof File ? await file.text() : file.text);
      const next = { table, mapping: autoMapping(table.headers), file: file.name, kind } as const;
      if (missingFields(next.mapping).length > 0) setPending(next);
      else create(next);
    } catch (e) {
      setNotice({ tone: "error", text: e instanceof BomParseError ? e.message : "This file could not be read. Upload a CSV or XLSX file." });
    }
  }

  async function extract(file: File) {
    setNotice(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setNotice({ tone: "error", text: `The file limit is ${MAX_UPLOAD_LABEL}.` });
      return;
    }
    setExtracting(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/extract", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) {
        const scanned = data.pagesSelected ? ` ${data.pagesScanned} pages scanned, ${data.pagesSelected} would have been sent.` : "";
        setNotice({ tone: data.code === "no_api_key" ? "info" : "error", text: `${data.message}${scanned}` });
        return;
      }
      const id = actions.createProject({
        name: nameFromFile(file.name),
        document: {
          file: file.name,
          provenance: `Extracted by ${data.model}. Every line needs a person's check.`,
          pagesScanned: data.pagesScanned,
          pagesSent: data.pagesSent,
        },
        lines: data.lines,
        // Extracted lines never count on their own, whatever their confidence.
        autoAcceptHigh: false,
      });
      router.push(`/project/${id}/lines`);
    } catch {
      setNotice({ tone: "error", text: "The upload failed. Check the connection and try again." });
    } finally {
      setExtracting(false);
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <button
        type="button"
        onClick={() => bomInput.current?.click()}
        className="card group flex flex-col items-start gap-4 p-6 text-left card-lift"
      >
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand-soft-ink">
          <Icon name="upload" size={20} />
        </span>
        <span>
          <span className="block text-base font-semibold">Upload a bill of materials</span>
          <span className="mt-1 block text-sm text-ink-2">
            CSV or XLSX, read in your browser. Needs description, quantity and unit; section, kg per unit, price and transport are optional. A .json
            project file opens as a project.
          </span>
        </span>
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand">
          Choose a file <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>
      <input
        ref={bomInput}
        type="file"
        accept=".csv,.xlsx,.json,text/csv"
        className="sr-only"
        tabIndex={-1}
        aria-label="Upload a CSV or XLSX bill of materials"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await read(f);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={extracting}
        onClick={() => specInput.current?.click()}
        className="card group flex flex-col items-start gap-4 p-6 text-left card-lift disabled:opacity-70"
      >
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-info-soft text-info">
          <Icon name="sparkles" size={20} />
        </span>
        <span>
          <span className="block text-base font-semibold">Extract from a specification</span>
          <span className="mt-1 block text-sm text-ink-2">
            PDF or text, up to {MAX_UPLOAD_LABEL}. Pages that look like they hold quantities go to an LLM; every line it finds lands in review with
            its quote, and none counts until you accept it.
          </span>
        </span>
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-info">
          {extracting ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> Reading the document…
            </>
          ) : (
            <>
              Choose a PDF <Icon name="arrow-right" size={14} className="transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </span>
      </button>
      <input
        ref={specInput}
        type="file"
        accept=".pdf,.txt,.md,application/pdf,text/plain"
        className="sr-only"
        tabIndex={-1}
        aria-label="Upload a PDF or text specification"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await extract(f);
          e.target.value = "";
        }}
      />

      <div className="card flex flex-col gap-4 p-6">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-ink-2">
          <Icon name="wind" size={20} />
        </span>
        <div>
          <h3 className="text-base font-semibold">Quick start</h3>
          <p className="mt-1 text-sm text-ink-2">
            An onshore wind turbine foundation and a small substation, 25 lines with delivery distances. Synthetic data.
          </p>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          <button
            className="btn btn-primary"
            onClick={async () => {
              const res = await fetch("/demo/wind-foundation.csv");
              await read({ name: "wind-foundation.csv", text: await res.text() });
            }}
          >
            Load the wind demo
          </button>
          <a className="btn btn-ghost" href="#demos">
            More demos
          </a>
        </div>
      </div>

      {notice && (
        <p
          className={`rounded-xl px-3.5 py-2.5 text-sm lg:col-span-3 ${notice.tone === "error" ? "bg-bad-soft text-bad" : "bg-info-soft text-info"}`}
        >
          {notice.text}
        </p>
      )}
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
