"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alternatives } from "@/components/Alternatives";
import { Results } from "@/components/Results";
import { ReviewTable } from "@/components/ReviewTable";
import { SpendVsActivity } from "@/components/SpendVsActivity";
import { catalogue } from "@/lib/catalogue";
import { computeTotals, HIGH_CONFIDENCE } from "@/lib/engine";
import { tonnes } from "@/lib/format";
import { actions, useHistory, type Project } from "@/lib/store";
import { Icon } from "./Icon";
import { PlaceholderNotice } from "./ui";

type View = "review" | "results" | "alternatives" | "spend";
const VIEWS: [View, string][] = [
  ["review", "Review"],
  ["results", "Results"],
  ["alternatives", "Alternatives"],
  ["spend", "Spend vs activity"],
];

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
    <main className="mx-auto w-full max-w-[1400px] px-4 pt-6 pb-16 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
        <Icon name="arrow-left" size={14} /> All projects
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <input
            key={project.name}
            aria-label="Project name"
            defaultValue={project.name}
            className="-ml-1.5 w-full max-w-xl rounded-lg bg-transparent px-1.5 text-[26px] font-semibold tracking-tight hover:bg-surface-2 focus:bg-surface focus:outline-none"
            onBlur={(e) => {
              const name = e.target.value.trim();
              if (name && name !== project.name) actions.renameProject(id, name);
            }}
          />
          {document && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-3">
              <Icon name="file" size={14} />
              {document.file} · {document.provenance}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1.5">
            <span className="num text-[30px] leading-none font-semibold tracking-tight">{tonnes(totals.kgCO2e)}</span>
            <span className="text-sm text-ink-3">tCO₂e</span>
          </div>
          <p className="mt-1 text-xs text-ink-3">
            {totals.countedLines} of {lines.length} lines counted
            {totals.pendingLines > 0 && <span className="text-warn"> · {totals.pendingLines} need review</span>}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <PlaceholderNotice />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-line">
        <nav className="-mb-px flex gap-1" role="tablist">
          {VIEWS.map(([v, label]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              className="border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-ink-3 hover:text-ink aria-selected:border-brand aria-selected:text-ink"
              onClick={() => setView(v)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="flex gap-1 pb-2">
          <button
            className="btn btn-ghost btn-sm btn-icon"
            disabled={!canUndo}
            onClick={() => actions.undo(id)}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Icon name="undo" size={15} />
          </button>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            disabled={!canRedo}
            onClick={() => actions.redo(id)}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
          >
            <Icon name="redo" size={15} />
          </button>
        </div>
      </div>

      <div className="mt-5">
        {view === "results" && <Results lines={lines} totals={totals} />}
        {view === "alternatives" && <Alternatives projectId={id} lines={lines} switches={switches} options={options} />}
        {view === "spend" && (
          <SpendVsActivity projectId={id} lines={lines} options={options} premiumPercent={premiumPercent} lineIds={comparisonLineIds} />
        )}
        {view === "review" && (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--brand)]"
                  checked={autoAcceptHigh}
                  onChange={(e) => actions.setAutoAccept(id, e.target.checked)}
                />
                Auto-accept high confidence
              </label>
              <button
                className="btn btn-sm ml-auto"
                disabled={highPending.length === 0}
                onClick={() =>
                  actions.setStatus(
                    id,
                    highPending.map((l) => l.id),
                    "accepted",
                  )
                }
              >
                <Icon name="check" size={14} /> Accept high confidence ({highPending.length})
              </button>
            </div>
            <ReviewTable projectId={id} lines={lines} totals={totals} autoAcceptHigh={autoAcceptHigh} />
          </div>
        )}
      </div>
    </main>
  );
}
