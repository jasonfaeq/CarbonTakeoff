"use client";

import { useEffect, useMemo, useState } from "react";
import { Results } from "@/components/Results";
import { ReviewTable } from "@/components/ReviewTable";
import { BomParseError, parseCsv } from "@/lib/bom/parse";
import { catalogue, usingPlaceholderFactors } from "@/lib/catalogue";
import { computeTotals, HIGH_CONFIDENCE } from "@/lib/engine";
import { tonnes } from "@/lib/format";
import { actions, useHistory, useProjectState } from "@/lib/store";

const CSV_PROVENANCE = "Parsed and rule-matched in your browser. The file was not uploaded.";

export default function Home() {
  const { lines, document, autoAcceptHigh } = useProjectState();
  const { canUndo, canRedo } = useHistory();
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"review" | "results">("review");
  const options = useMemo(() => ({ autoAcceptHigh }), [autoAcceptHigh]);
  const totals = useMemo(() => computeTotals(lines, catalogue, options), [lines, options]);
  const highPending = lines.filter((l) => l.status === "pending" && l.factorId && l.confidence >= HIGH_CONFIDENCE);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      const el = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      e.preventDefault();
      if (e.shiftKey) actions.redo();
      else actions.undo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function load(text: string, name: string) {
    setError(null);
    try {
      actions.loadDocument(parseCsv(text, name, catalogue), { file: name, provenance: CSV_PROVENANCE });
    } catch (e) {
      setError(e instanceof BomParseError ? e.message : "This file could not be read as a CSV.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Carbon Takeoff</h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Load a bill of materials as CSV, check every matched line, and only accepted lines count towards the total.
      </p>
      {usingPlaceholderFactors && (
        <p className="mt-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Placeholder factors: the numbers below are synthetic and not a real estimate.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
          Choose a CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await load(await f.text(), f.name);
              e.target.value = "";
            }}
          />
        </label>
        <button
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          onClick={async () => {
            const res = await fetch("/demo/wind-foundation.csv");
            await load(await res.text(), "wind-foundation.csv");
          }}
        >
          Load demo
        </button>
        {lines.length > 0 && (
          <button className="text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-900" onClick={actions.reset}>
            Start over
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-zinc-500">Columns: description, quantity, unit. Optional: section, kg_per_unit, unit_price_eur.</p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {document && (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium">{document.file}</h2>
              <p className="text-sm text-zinc-500">{document.provenance}</p>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{tonnes(totals.kgCO2e)}</span> tCO₂e from{" "}
              {totals.countedLines} of {lines.length} lines
              {totals.pendingLines > 0 && `, ${totals.pendingLines} need review`}
            </p>
          </div>
          <div className="mt-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800" role="tablist">
            {(["review", "results"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium capitalize text-zinc-500 aria-selected:border-zinc-900 aria-selected:text-zinc-900 dark:aria-selected:border-zinc-100 dark:aria-selected:text-zinc-100"
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </div>
          {view === "results" && <Results lines={lines} totals={totals} />}
          {view === "review" && (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-4 rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={autoAcceptHigh} onChange={(e) => actions.setAutoAccept(e.target.checked)} />
                  Auto-accept high confidence
                </label>
                <button
                  className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700"
                  disabled={highPending.length === 0}
                  onClick={() =>
                    actions.setStatus(
                      highPending.map((l) => l.id),
                      "accepted",
                    )
                  }
                >
                  Accept high confidence ({highPending.length})
                </button>
                <div className="ml-auto flex gap-2">
                  <button
                    className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700"
                    disabled={!canUndo}
                    onClick={actions.undo}
                    title="Undo (Ctrl+Z)"
                  >
                    Undo
                  </button>
                  <button
                    className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700"
                    disabled={!canRedo}
                    onClick={actions.redo}
                    title="Redo (Ctrl+Shift+Z)"
                  >
                    Redo
                  </button>
                </div>
              </div>
              <ReviewTable lines={lines} totals={totals} autoAcceptHigh={autoAcceptHigh} />
            </>
          )}
        </section>
      )}
    </main>
  );
}
