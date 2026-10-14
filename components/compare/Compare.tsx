"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { catalogue, transportModes } from "@/lib/catalogue";
import { DEMOS } from "@/lib/demos";
import { computeTotals, computeTransportTotals } from "@/lib/engine";
import { percent, tonnes } from "@/lib/format";
import { GROUP_ORDER, groupStyle } from "@/lib/groups";
import { loadDemo } from "@/lib/load-demo";
import { useHydrated, useProjects } from "@/lib/store";
import { Icon } from "../Icon";
import { EmptyState, Swatch } from "../ui";

const MAX = 4;

export function Compare() {
  const projects = useProjects();
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const fromUrl = (params.get("ids") ?? "").split(",").filter((id) => projects.some((p) => p.id === id));
  const selected = fromUrl.length > 0 ? fromUrl.slice(0, MAX) : projects.slice(0, 2).map((p) => p.id);

  const rows = useMemo(
    () =>
      selected
        .map((id) => projects.find((p) => p.id === id)!)
        .filter(Boolean)
        .map((p) => {
          const totals = computeTotals(p.lines, catalogue, { autoAcceptHigh: p.autoAcceptHigh });
          return { project: p, totals, a4: computeTransportTotals(p.lines, totals.results, transportModes).kgCO2e };
        }),
    [selected, projects],
  );

  function setSelected(ids: string[]) {
    router.replace(`${pathname}?ids=${ids.join(",")}`, { scroll: false });
  }

  async function openTwins() {
    setBusy(true);
    try {
      const ids: string[] = [];
      for (const demoId of ["residential-concrete", "residential-timber"]) ids.push(await loadDemo(DEMOS.find((d) => d.id === demoId)!));
      setSelected(ids);
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) return null;

  const header = (
    <div className="mb-6">
      <p className="eyebrow">Compare</p>
      <h1 className="mt-2 text-[30px] font-semibold tracking-tight">Projects side by side</h1>
      <p className="mt-1 max-w-2xl text-ink-2">
        Totals and material mix of up to four projects on one scale. Each is computed exactly as on its own page, from its counted lines.
      </p>
    </div>
  );

  if (projects.length < 2) {
    return (
      <main className="mx-auto w-full max-w-[1400px] px-4 pt-10 pb-16 sm:px-6">
        {header}
        <EmptyState
          icon="columns"
          title="Two projects are needed"
          action={
            <button className="btn btn-primary" disabled={busy} onClick={openTwins}>
              <Icon name="building" size={15} /> {busy ? "Opening…" : "Open the concrete and timber residential demos"}
            </button>
          }
        >
          The two residential demos are the same block with different frames, which makes a good first comparison.
        </EmptyState>
      </main>
    );
  }

  const max = Math.max(...rows.map((r) => r.totals.kgCO2e), 1);
  const groups = GROUP_ORDER.filter((g) => rows.some((r) => r.totals.byGroup.some((b) => b.key === g)));
  const base = rows[0];

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pt-10 pb-16 sm:px-6">
      {header}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Projects to compare">
        {projects.map((p) => {
          const on = selected.includes(p.id);
          return (
            <button
              key={p.id}
              className="chip"
              aria-pressed={on}
              disabled={!on && selected.length >= MAX}
              onClick={() => setSelected(on ? selected.filter((id) => id !== p.id) : [...selected, p.id])}
            >
              {on && <Icon name="check" size={13} />}
              {p.name}
            </button>
          );
        })}
      </div>

      {rows.length < 2 ? (
        <p className="mt-8 text-sm text-ink-3">Pick at least two projects.</p>
      ) : (
        <div className="mt-6 grid gap-5">
          <div className={`grid gap-4 sm:grid-cols-2 ${rows.length > 2 ? "xl:grid-cols-4" : ""}`}>
            {rows.map(({ project, totals, a4 }, i) => {
              const delta = i > 0 && base.totals.kgCO2e > 0 ? ((totals.kgCO2e - base.totals.kgCO2e) / base.totals.kgCO2e) * 100 : null;
              return (
                <Link key={project.id} href={`/project/${project.id}`} className="card p-5 transition-shadow hover:shadow-md">
                  <div className="truncate text-sm font-medium">{project.name}</div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="num text-[30px] leading-none font-semibold tracking-tight">{tonnes(totals.kgCO2e)}</span>
                    <span className="text-sm text-ink-3">tCO₂e A1–A3</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-ink-3">
                    <span>{tonnes(a4)} t A4</span>
                    <span>
                      {totals.countedLines}/{project.lines.length} lines counted
                    </span>
                    {delta !== null && (
                      <span className={delta < 0 ? "font-medium text-good" : "font-medium text-bad"}>
                        {delta > 0 ? "+" : "−"}
                        {percent(Math.abs(delta), 0)} vs {base.project.name}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          <section className="card p-5">
            <h2 className="font-semibold">Material mix on one scale</h2>
            <ul className="mt-5 grid gap-4">
              {rows.map(({ project, totals }) => (
                <li key={project.id} className="grid gap-1.5 sm:grid-cols-[14rem_1fr_6rem] sm:items-center sm:gap-4">
                  <span className="truncate text-sm">{project.name}</span>
                  <span
                    className="flex h-7 overflow-hidden rounded-lg bg-surface-2"
                    style={{ width: `${(totals.kgCO2e / max) * 100}%`, minWidth: 4 }}
                  >
                    {GROUP_ORDER.map((g) => {
                      const v = totals.byGroup.find((b) => b.key === g)?.kgCO2e ?? 0;
                      if (v <= 0) return null;
                      return (
                        <span
                          key={g}
                          title={`${g}: ${tonnes(v)} t`}
                          style={{ width: `${(v / totals.kgCO2e) * 100}%`, background: groupStyle(g).color }}
                        />
                      );
                    })}
                  </span>
                  <span className="num text-sm sm:text-right">{tonnes(totals.kgCO2e)} t</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-2">
              {groups.map((g) => (
                <span key={g} className="flex items-center gap-1.5">
                  <Swatch group={g} size={10} />
                  {g}
                </span>
              ))}
            </div>
          </section>

          <section className="card overflow-x-auto">
            <table className="data-table min-w-[640px]">
              <thead>
                <tr>
                  <th>Material</th>
                  {rows.map(({ project }, i) => (
                    <th key={project.id} className="right">
                      {project.name}
                      {i === 0 && <span className="ml-1 text-ink-3">(base)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const baseValue = base.totals.byGroup.find((b) => b.key === g)?.kgCO2e ?? 0;
                  return (
                    <tr key={g}>
                      <td>
                        <span className="flex items-center gap-2">
                          <Swatch group={g} />
                          {g}
                        </span>
                      </td>
                      {rows.map(({ project, totals }, i) => {
                        const v = totals.byGroup.find((b) => b.key === g)?.kgCO2e ?? 0;
                        const d = v - baseValue;
                        return (
                          <td key={project.id} className="right num">
                            {tonnes(v)}
                            {i > 0 && Math.abs(d) >= 50 && (
                              <div className={`text-xs ${d < 0 ? "text-good" : "text-bad"}`}>
                                {d > 0 ? "+" : "−"}
                                {tonnes(Math.abs(d))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr>
                  <td className="font-semibold">Total A1–A3</td>
                  {rows.map(({ project, totals }) => (
                    <td key={project.id} className="right num font-semibold">
                      {tonnes(totals.kgCO2e)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>
          <p className="text-xs text-ink-3">
            Only counted lines are compared. A project with lines still awaiting review will look lighter than it is.
          </p>
        </div>
      )}
    </main>
  );
}
