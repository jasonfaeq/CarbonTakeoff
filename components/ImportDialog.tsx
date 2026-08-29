"use client";

import { useEffect, useRef, useState } from "react";
import { FIELD_LABELS, missingFields, REQUIRED_FIELDS, type BomField, type ColumnMapping, type RawTable } from "@/lib/bom/parse";

const FIELDS = Object.keys(FIELD_LABELS) as BomField[];

/** Asks which column is which when the headers are not ones the parser knows. */
export function ImportDialog({
  table,
  initial,
  fileName,
  onCancel,
  onImport,
}: {
  table: RawTable;
  initial: ColumnMapping;
  fileName: string;
  onCancel: () => void;
  onImport: (mapping: ColumnMapping) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mapping, setMapping] = useState(initial);
  const missing = missingFields(mapping);
  const preview = table.rows.filter((r) => r.some((c) => String(c ?? "").trim())).slice(0, 5);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function set(column: number, field: BomField | null) {
    // One column per field: taking a field away from another column keeps the mapping unambiguous.
    setMapping((m) => m.map((f, i) => (i === column ? field : f === field ? null : f)));
  }

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Which column is which?</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {fileName}: some headers were not recognised. Description, quantity and unit are needed; the rest is optional.
        </p>
      </div>
      <div className="max-h-[60vh] overflow-auto px-5 py-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {table.headers.map((h, i) => (
                <th key={i} className="min-w-36 border-b border-zinc-200 pb-2 pr-2 align-bottom font-normal dark:border-zinc-800">
                  <div className="mb-1 truncate text-xs text-zinc-500">{h || `Column ${i + 1}`}</div>
                  <select
                    aria-label={`Field for column ${h || i + 1}`}
                    className="w-full rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
                    value={mapping[i] ?? ""}
                    onChange={(e) => set(i, (e.target.value || null) as BomField | null)}
                  >
                    <option value="">Ignore</option>
                    {FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {FIELD_LABELS[f]}
                        {REQUIRED_FIELDS.includes(f) ? " *" : ""}
                      </option>
                    ))}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, r) => (
              <tr key={r} className="border-b border-zinc-100 dark:border-zinc-900">
                {table.headers.map((_, c) => (
                  <td key={c} className={`py-1.5 pr-2 ${mapping[c] ? "" : "text-zinc-400"}`}>
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <span className="text-sm text-zinc-500">
          {missing.length > 0 ? `Still needed: ${missing.map((f) => FIELD_LABELS[f]).join(", ")}` : "Ready."}
        </span>
        <div className="flex gap-2">
          <button className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
            disabled={missing.length > 0}
            onClick={() => onImport(mapping)}
          >
            Import
          </button>
        </div>
      </div>
    </dialog>
  );
}
