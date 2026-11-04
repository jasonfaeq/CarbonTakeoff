"use client";

import { useEffect, useRef, useState } from "react";
import { FIELD_LABELS, missingFields, REQUIRED_FIELDS, type BomField, type ColumnMapping, type RawTable } from "@/lib/bom/parse";
import { Icon } from "./Icon";

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
  const preview = table.rows.filter((r) => r.some((c) => String(c ?? "").trim())).slice(0, 6);
  const rowCount = table.rows.filter((r) => r.some((c) => String(c ?? "").trim())).length;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function set(column: number, field: BomField | null) {
    // One column per field: taking a field for this column frees it everywhere else.
    setMapping((m) => m.map((f, i) => (i === column ? field : f === field ? null : f)));
  }

  return (
    <dialog ref={ref} onCancel={onCancel} aria-labelledby="import-title" className="dialog w-[min(60rem,calc(100vw-2rem))]">
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div>
          <h2 id="import-title" className="text-lg font-semibold tracking-tight">
            Which column is which?
          </h2>
          <p className="mt-1 text-sm text-ink-2">
            <span className="font-medium text-ink">{fileName}</span>, {rowCount} rows. Some headers were not recognised. Description, quantity and
            unit are needed; the rest is optional.
          </p>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onCancel} aria-label="Close">
          <Icon name="x" />
        </button>
      </div>
      <div className="max-h-[58vh] overflow-auto px-6 py-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {table.headers.map((h, i) => (
                <th key={i} className="min-w-40 pr-2 pb-3 align-bottom font-normal">
                  <div className="mb-1.5 truncate text-xs text-ink-3">{h || `Column ${i + 1}`}</div>
                  <select
                    aria-label={`Field for column ${h || i + 1}`}
                    className="field field-sm"
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
              <tr key={r} className="border-t border-line">
                {table.headers.map((_, c) => (
                  <td key={c} className={`py-2 pr-2 ${mapping[c] ? "text-ink" : "text-ink-3"}`}>
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/50 px-6 py-4">
        <span className={`text-sm ${missing.length ? "text-warn" : "text-good"}`}>
          {missing.length > 0 ? `Still needed: ${missing.map((f) => FIELD_LABELS[f]).join(", ")}` : `Ready to import ${rowCount} rows.`}
        </span>
        <div className="flex gap-2">
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={missing.length > 0} onClick={() => onImport(mapping)}>
            Import
          </button>
        </div>
      </div>
    </dialog>
  );
}
