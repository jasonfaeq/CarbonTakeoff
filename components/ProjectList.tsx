"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { catalogue } from "@/lib/catalogue";
import { computeTotals } from "@/lib/engine";
import { timeAgo, tonnes } from "@/lib/format";
import { actions, useHydrated, useProjects } from "@/lib/store";

export function ProjectList() {
  const projects = useProjects();
  const hydrated = useHydrated();
  const router = useRouter();
  if (!hydrated) return null;
  if (projects.length === 0) return <p className="text-sm text-zinc-500">No projects yet. Upload a bill of materials or load the demo.</p>;

  const sorted = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((p) => {
        const totals = computeTotals(p.lines, catalogue, { autoAcceptHigh: p.autoAcceptHigh });
        return (
          <li
            key={p.id}
            className="group relative rounded-lg border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <Link href={`/project/${p.id}`} className="block font-medium after:absolute after:inset-0">
              {p.name}
            </Link>
            <p className="mt-0.5 truncate text-xs text-zinc-500">
              {p.document?.file ?? "No document"} · {p.lines.length} lines · edited {timeAgo(p.updatedAt)}
            </p>
            <p className="mt-3 text-sm">
              <span className="text-xl font-semibold tabular-nums">{tonnes(totals.kgCO2e)}</span> tCO₂e
              {totals.pendingLines > 0 && <span className="text-zinc-500"> · {totals.pendingLines} to review</span>}
            </p>
            <div className="relative z-10 mt-3 flex gap-3 text-xs text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
                onClick={() => {
                  const id = actions.duplicateProject(p.id);
                  if (id) router.push(`/project/${id}`);
                }}
              >
                Duplicate
              </button>
              <button
                className="hover:text-red-600"
                onClick={() => {
                  if (window.confirm(`Delete "${p.name}"? This cannot be undone.`)) actions.deleteProject(p.id);
                }}
              >
                Delete
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
