"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseNumber } from "@/lib/bom/parse";
import { catalogue } from "@/lib/catalogue";
import { HIGH_CONFIDENCE, isCounted, matchFactor, capConfidence, normaliseUnit, NO_SECTION, type BomLine } from "@/lib/engine";
import { factorValue, tonnes } from "@/lib/format";
import { actions, newId } from "@/lib/store";
import { toast } from "@/lib/toast";
import { Icon } from "../Icon";
import { ConfidenceBadge, EmptyState, FactorBadges, StatusBadge, Swatch } from "../ui";
import { useCurrentProject } from "./context";
import { FactorSelect } from "./FactorSelect";

export type LineFilter = "all" | "open" | "counted" | "rejected" | "proxy" | "nofactor" | "errors";

const FILTERS: { id: LineFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Needs review" },
  { id: "counted", label: "Counted" },
  { id: "rejected", label: "Rejected" },
  { id: "proxy", label: "Proxy factor" },
  { id: "nofactor", label: "No factor" },
  { id: "errors", label: "Errors" },
];

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));
}

function NumberField({ value, label, onChange }: { value: number | null | undefined; label: string; onChange: (value: number | null) => void }) {
  return (
    <input
      key={String(value ?? "")}
      aria-label={label}
      inputMode="decimal"
      className="field field-sm field-quiet num text-right"
      defaultValue={value ?? ""}
      placeholder="–"
      onBlur={(e) => {
        const next = parseNumber(e.target.value);
        if (next !== (value ?? null)) onChange(next);
      }}
    />
  );
}

export function LinesTable() {
  const { project, totals, options, openLine } = useCurrentProject();
  const { id, lines } = project;
  const params = useSearchParams();
  const initial = params.get("filter") as LineFilter | null;
  const [filter, setFilter] = useState<LineFilter>(initial && FILTERS.some((f) => f.id === initial) ? initial : "all");
  const [section, setSection] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const search = useRef<HTMLInputElement>(null);

  const resultById = useMemo(() => new Map(totals.results.map((r) => [r.lineId, r])), [totals]);
  const sections = useMemo(() => [...new Set(lines.map((l) => l.section?.trim() || NO_SECTION))], [lines]);
  const tests: Record<LineFilter, (l: BomLine) => boolean> = {
    all: () => true,
    open: (l) => l.status === "pending" && !isCounted(l, options),
    counted: (l) => isCounted(l, options) && resultById.get(l.id)?.kgCO2e !== null,
    rejected: (l) => l.status === "rejected",
    proxy: (l) => catalogue.byId.get(l.factorId ?? "")?.applicability === "proxy",
    nofactor: (l) => !l.factorId,
    errors: (l) => l.status !== "rejected" && Boolean(resultById.get(l.id)?.error),
  };
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = lines.filter((l) => {
    if (!tests[filter](l)) return false;
    if (section !== "all" && (l.section?.trim() || NO_SECTION) !== section) return false;
    if (words.length === 0) return true;
    const factor = catalogue.byId.get(l.factorId ?? "");
    const text =
      `${l.description} ${l.section ?? ""} ${l.unit} ${l.source.ref} ${l.source.snippet} ${factor?.name ?? ""} ${l.matchReason}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
  const highPending = lines.filter((l) => l.status === "pending" && l.factorId && l.confidence >= HIGH_CONFIDENCE);
  const selectedIds = [...selected].filter((s) => lines.some((l) => l.id === s));
  const allShownSelected = shown.length > 0 && shown.every((l) => selected.has(l.id));

  function decide(line: BomLine, status: BomLine["status"]) {
    actions.setStatus(id, [line.id], line.status === status ? "pending" : status);
  }

  function toggle(lineId: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }

  function addLine() {
    const lineId = `manual-${newId()}`;
    actions.addLine(id, {
      id: lineId,
      description: "New line",
      quantity: null,
      unit: "t",
      factorId: null,
      confidence: 0,
      matchReason: "Entered by hand: describe it, then pick a factor",
      status: "pending",
      naics: null,
      source: { kind: "manual", file: "Entered by hand", ref: "–", snippet: "" },
    });
    setFilter("all");
    setSection("all");
    setActiveId(lineId);
    requestAnimationFrame(() => document.getElementById(`desc-${lineId}`)?.focus());
  }

  // Keyboard review. Refs keep the listener stable while the lists change underneath it.
  const shownRef = useRef(shown);
  const activeRef = useRef(activeId);
  useEffect(() => {
    shownRef.current = shown;
    activeRef.current = activeId;
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(e.target)) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if (document.querySelector("dialog[open]")) return;
      const list = shownRef.current;
      const index = list.findIndex((l) => l.id === activeRef.current);
      const line = list[index];
      const key = e.key.toLowerCase();
      if (key === "/") {
        e.preventDefault();
        search.current?.focus();
      } else if (key === "j" || key === "k" || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = key === "j" || e.key === "ArrowDown" ? 1 : -1;
        const next = list[Math.min(Math.max(index + step, 0), list.length - 1)];
        if (next) {
          setActiveId(next.id);
          document.getElementById(`row-${next.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      } else if (line && key === "a") {
        actions.setStatus(id, [line.id], line.status === "accepted" ? "pending" : "accepted");
      } else if (line && key === "r") {
        actions.setStatus(id, [line.id], line.status === "rejected" ? "pending" : "rejected");
      } else if (line && key === "u") {
        actions.setStatus(id, [line.id], "pending");
      } else if (line && key === "x") {
        toggle(line.id);
      } else if (line && (e.key === "Enter" || key === "o")) {
        e.preventDefault();
        openLine(line.id);
      } else if (e.key === "Escape") {
        setSelected(new Set());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, openLine]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-56 flex-1 sm:max-w-80">
          <span className="sr-only">Search lines</span>
          <Icon name="search" size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input
            ref={search}
            type="search"
            className="field !pl-9 !pr-9"
            placeholder="Search lines, factors, sources"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="kbd pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2">/</kbd>
        </label>
        {sections.length > 1 && (
          <select aria-label="Section" className="field w-auto min-w-44" value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="all">All sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--brand)]"
              checked={project.autoAcceptHigh}
              onChange={(e) => actions.setAutoAccept(id, e.target.checked)}
            />
            Auto-accept high confidence
          </label>
          <button
            className="btn btn-sm"
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
          <button className="btn btn-sm" onClick={addLine}>
            <Icon name="plus" size={14} /> Add line
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter lines">
        {FILTERS.map((f) => {
          const count = lines.filter(tests[f.id]).length;
          if (count === 0 && f.id !== "all" && filter !== f.id) return null;
          return (
            <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label} <span className="count">{count}</span>
            </button>
          );
        })}
      </div>

      {selectedIds.length > 0 && (
        <div className="rise sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ink px-3 py-2 text-bg shadow-md">
          <span className="px-1 text-sm font-medium">{selectedIds.length} selected</span>
          <button
            className="btn btn-sm"
            onClick={() => {
              actions.setStatus(id, selectedIds, "accepted");
              toast(`${selectedIds.length} lines accepted.`, { undoProjectId: id });
            }}
          >
            <Icon name="check" size={14} /> Accept
          </button>
          <button
            className="btn btn-sm"
            onClick={() => {
              actions.setStatus(id, selectedIds, "rejected");
              toast(`${selectedIds.length} lines rejected.`, { undoProjectId: id });
            }}
          >
            <Icon name="x" size={14} /> Reject
          </button>
          <button className="btn btn-sm" onClick={() => actions.setStatus(id, selectedIds, "pending")}>
            Reset
          </button>
          <div className="w-56">
            <FactorSelect
              label="Set factor for the selected lines"
              value={null}
              onChange={(factorId) => actions.updateLines(id, selectedIds, { factorId, confidence: 1, matchReason: "Chosen by the reviewer" })}
            />
          </div>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => {
              actions.removeLines(id, selectedIds);
              toast(`${selectedIds.length} lines deleted.`, { undoProjectId: id });
              setSelected(new Set());
            }}
          >
            <Icon name="trash" size={14} /> Delete
          </button>
          <button className="ml-auto rounded-md px-2 py-1 text-sm opacity-80 hover:opacity-100" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState icon="filter" title="No line matches">
          {query ? `Nothing matches “${query}”.` : "Nothing in this filter."} Try another filter or clear the search.
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table min-w-[1000px]">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all shown lines"
                    className="h-4 w-4 accent-[var(--brand)]"
                    checked={allShownSelected}
                    onChange={() => setSelected(allShownSelected ? new Set() : new Set(shown.map((l) => l.id)))}
                  />
                </th>
                <th className="min-w-[17rem]">Line</th>
                <th className="right min-w-[6.5rem]">Quantity</th>
                <th className="min-w-[5.5rem]">Unit</th>
                <th className="right min-w-[6rem]">kg / unit</th>
                <th className="min-w-[19rem]">Factor</th>
                <th className="right w-24">tCO₂e</th>
                <th className="w-40">Decision</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((line) => {
                const factor = catalogue.byId.get(line.factorId ?? "");
                const result = resultById.get(line.id)!;
                const active = line.id === activeId;
                return (
                  <tr
                    key={line.id}
                    id={`row-${line.id}`}
                    className={`${line.status === "rejected" ? "opacity-55" : ""} ${active ? "[&>td]:!bg-brand-soft/60 [&>td:first-child]:shadow-[inset_3px_0_0_var(--brand)]" : ""}`}
                    onFocusCapture={() => setActiveId(line.id)}
                    onClick={() => setActiveId(line.id)}
                  >
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${line.description}`}
                        className="mt-2 h-4 w-4 accent-[var(--brand)]"
                        checked={selected.has(line.id)}
                        onChange={() => toggle(line.id)}
                      />
                    </td>
                    <td>
                      <input
                        id={`desc-${line.id}`}
                        key={line.description}
                        aria-label={`Description of ${line.description}`}
                        className="field field-sm field-quiet -ml-2 font-medium"
                        defaultValue={line.description}
                        onBlur={(e) => {
                          const description = e.target.value.trim();
                          if (!description || description === line.description) return;
                          // A hand-entered line has no match yet: describing it is how it gets one.
                          if (line.source.kind === "manual" && !line.factorId) {
                            const m = matchFactor(description);
                            actions.updateLine(id, line.id, {
                              description,
                              factorId: m.factorId,
                              naics: m.naics,
                              confidence: capConfidence(m.confidence, m.factorId, catalogue),
                              matchReason: m.reason,
                            });
                          } else actions.updateLine(id, line.id, { description });
                        }}
                      />
                      <button
                        className="group mt-1 flex max-w-[22rem] items-center gap-1 text-left text-xs text-ink-3 hover:text-ink"
                        title="Show the working, the factor's source and the alternatives"
                        onClick={() => openLine(line.id)}
                      >
                        <span className="truncate">
                          {line.section && <span className="text-ink-2">{line.section} · </span>}
                          {line.source.ref}
                          {line.source.snippet && (
                            <>
                              : <span className="font-mono">{line.source.snippet}</span>
                            </>
                          )}
                        </span>
                        <Icon name="chevron-right" size={13} className="opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </td>
                    <td>
                      <NumberField
                        value={line.quantity}
                        label={`Quantity of ${line.description}`}
                        onChange={(quantity) => actions.updateLine(id, line.id, { quantity })}
                      />
                    </td>
                    <td>
                      <input
                        key={line.unit}
                        aria-label={`Unit of ${line.description}`}
                        aria-invalid={!normaliseUnit(line.unit)}
                        className="field field-sm field-quiet"
                        defaultValue={line.unit}
                        onBlur={(e) => {
                          if (e.target.value !== line.unit) actions.updateLine(id, line.id, { unit: e.target.value });
                        }}
                      />
                    </td>
                    <td>
                      <NumberField
                        value={line.kgPerUnit}
                        label={`kg per unit of ${line.description}`}
                        onChange={(kgPerUnit) => actions.updateLine(id, line.id, { kgPerUnit })}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Swatch group={factor?.group} />
                        <FactorSelect
                          label={`Factor for ${line.description}`}
                          value={line.factorId}
                          onChange={(factorId) => actions.updateLine(id, line.id, { factorId, confidence: 1, matchReason: "Chosen by the reviewer" })}
                        />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                        <ConfidenceBadge confidence={line.confidence} />
                        {factor && <FactorBadges factor={factor} />}
                        <span>{line.matchReason}</span>
                        {factor && (
                          <span className="num">
                            · {factorValue(factor.value)} {factor.unit.replace("CO2e", "CO₂e")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="right num font-medium">
                      {result.kgCO2e !== null ? (
                        <span className={result.counted ? "" : "text-ink-3"}>{tonnes(result.kgCO2e)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-normal text-bad">
                          <Icon name="alert" size={13} />
                          {result.error}
                        </span>
                      )}
                    </td>
                    <td>
                      <StatusBadge line={line} options={options} />
                      <div className="mt-1.5 flex gap-1">
                        <button
                          className="btn btn-sm"
                          aria-pressed={line.status === "accepted"}
                          aria-label={`Accept ${line.description}`}
                          onClick={() => decide(line, "accepted")}
                        >
                          <Icon name="check" size={14} /> Accept
                        </button>
                        <button
                          className="btn btn-sm btn-icon"
                          aria-pressed={line.status === "rejected"}
                          aria-label={`Reject ${line.description}`}
                          title="Reject"
                          onClick={() => decide(line, "rejected")}
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3 md:flex">
        <span>
          <kbd className="kbd">J</kbd> <kbd className="kbd">K</kbd> move
        </span>
        <span>
          <kbd className="kbd">A</kbd> accept
        </span>
        <span>
          <kbd className="kbd">R</kbd> reject
        </span>
        <span>
          <kbd className="kbd">U</kbd> undecide
        </span>
        <span>
          <kbd className="kbd">X</kbd> select
        </span>
        <span>
          <kbd className="kbd">Enter</kbd> details
        </span>
        <span>
          <kbd className="kbd">/</kbd> search
        </span>
        <span className="ml-auto">
          {shown.length} of {lines.length} lines shown · {tonnes(totals.kgCO2e)} tCO₂e counted
        </span>
      </p>
    </div>
  );
}
