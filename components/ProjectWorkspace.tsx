"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alternatives } from "@/components/Alternatives";
import { Results } from "@/components/Results";
import { ReviewTable } from "@/components/ReviewTable";
import { SpendVsActivity } from "@/components/SpendVsActivity";
import { catalogue, usingPlaceholderFactors } from "@/lib/catalogue";
import { computeTotals, HIGH_CONFIDENCE } from "@/lib/engine";
import { tonnes } from "@/lib/format";
import { actions, useHistory, type Project } from "@/lib/store";

type View = "review" | "results" | "alternatives" | "spend";
const VIEWS: [View, string][] = [
  ["review", "Review"],
  ["results", "Results"],
  ["alternatives", "Alternatives"],
  ["spend", "Spend vs activity"],
];

const button = "rounded border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700";

export function ProjectWorkspace({ project }: { project: Project }) {
  const { id, lines, document, autoAcceptHigh, switches, premiumPercent, comparisonLineIds } = project;
  const { canUndo, canRedo } = useHistory(id);
  const [view, setView] = useState<View>("review");
  const options = useMemo(() => ({ autoAcceptHigh }), [autoAcceptHigh]);
  const totals = useMemo(() => computeTotals(lines, catalogue, options), [lines, options]);
  const highPending = lines.filter((l) => l.status === "pending" && l.factorId && l.confidence >= HIGH_CONFIDENCE);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      const el = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      e.preventDefault();
      if (e.shiftKey) actions.redo(id);
      else actions.undo(id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        ← All projects
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <input
            key={project.name}
            aria-label="Project name"
            defaultValue={project.name}
            className="-ml-1 rounded bg-transparent px-1 text-2xl font-semibold tracking-tight hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none dark:hover:bg-zinc-900 dark:focus:bg-zinc-900"
            onBlur={(e) => {
              const name = e.target.value.trim();
              if (name && name !== project.name) actions.renameProject(id, name);
            }}
          />
          {document && (
            <p className="mt-1 text-sm text-zinc-500">
              {document.file} · {document.provenance}
            </p>
          )}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{tonnes(totals.kgCO2e)}</span> tCO₂e from{" "}
          {totals.countedLines} of {lines.length} lines
          {totals.pendingLines > 0 && `, ${totals.pendingLines} need review`}
        </p>
      </div>
      {usingPlaceholderFactors && (
        <p className="mt-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Placeholder factors: the numbers below are synthetic and not a real estimate.
        </p>
      )}

      <div className="mt-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800" role="tablist">
        {VIEWS.map(([v, label]) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-zinc-500 aria-selected:border-zinc-900 aria-selected:text-zinc-900 dark:aria-selected:border-zinc-100 dark:aria-selected:text-zinc-100"
            onClick={() => setView(v)}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "results" && <Results lines={lines} totals={totals} />}
      {view === "alternatives" && <Alternatives projectId={id} lines={lines} switches={switches} options={options} />}
      {view === "spend" && (
        <SpendVsActivity projectId={id} lines={lines} options={options} premiumPercent={premiumPercent} lineIds={comparisonLineIds} />
      )}
      {view === "review" && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={autoAcceptHigh} onChange={(e) => actions.setAutoAccept(id, e.target.checked)} />
              Auto-accept high confidence
            </label>
            <button
              className={button}
              disabled={highPending.length === 0}
              onClick={() =>
                actions.setStatus(
                  id,
                  highPending.map((l) => l.id),
                  "accepted",
                )
              }
            >
              Accept high confidence ({highPending.length})
            </button>
            <div className="ml-auto flex gap-2">
              <button className={button} disabled={!canUndo} onClick={() => actions.undo(id)} title="Undo (Ctrl+Z)">
                Undo
              </button>
              <button className={button} disabled={!canRedo} onClick={() => actions.redo(id)} title="Redo (Ctrl+Shift+Z)">
                Redo
              </button>
            </div>
          </div>
          <ReviewTable projectId={id} lines={lines} totals={totals} autoAcceptHigh={autoAcceptHigh} />
        </>
      )}
    </main>
  );
}
