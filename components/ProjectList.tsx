"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { catalogue } from "@/lib/catalogue";
import { computeTotals } from "@/lib/engine";
import { timeAgo, tonnes } from "@/lib/format";
import { groupStyle } from "@/lib/groups";
import { actions, useHydrated, useProjects } from "@/lib/store";
import { Icon } from "./Icon";

export function ProjectList() {
  const projects = useProjects();
  const hydrated = useHydrated();
  const router = useRouter();
  if (!hydrated) return <div className="h-36 animate-pulse rounded-2xl bg-surface-2" />;
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-2 px-6 py-10 text-center text-sm text-ink-3">
        No projects yet. Upload a bill of materials or load the demo.
      </div>
    );
  }

  const sorted = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sorted.map((p) => {
        const totals = computeTotals(p.lines, catalogue, { autoAcceptHigh: p.autoAcceptHigh });
        const decided = p.lines.length - totals.pendingLines;
        return (
          <li key={p.id} className="card group relative flex min-w-0 flex-col p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/project/${p.id}`} className="block truncate font-semibold after:absolute after:inset-0">
                  {p.name}
                </Link>
                <p className="mt-0.5 truncate text-xs text-ink-3">
                  {p.document?.file ?? "No document"} · edited {timeAgo(p.updatedAt)}
                </p>
              </div>
              <div className="relative z-10 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  title="Duplicate"
                  aria-label={`Duplicate ${p.name}`}
                  onClick={() => {
                    const id = actions.duplicateProject(p.id);
                    if (id) router.push(`/project/${id}`);
                  }}
                >
                  <Icon name="copy" size={15} />
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-icon btn-danger"
                  title="Delete"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => {
                    if (window.confirm(`Delete "${p.name}"? This cannot be undone.`)) actions.deleteProject(p.id);
                  }}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="num text-[28px] leading-none font-semibold tracking-tight">{tonnes(totals.kgCO2e)}</span>
              <span className="text-sm text-ink-3">tCO₂e</span>
            </div>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
              {totals.byGroup.map((g) => (
                <span key={g.key} style={{ width: `${(g.kgCO2e / (totals.kgCO2e || 1)) * 100}%`, background: groupStyle(g.key).color }} />
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-3">
              {p.lines.length} lines · {decided} decided
              {totals.pendingLines > 0 && <span className="text-warn"> · {totals.pendingLines} to review</span>}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
