"use client";

import { useSyncExternalStore } from "react";
import type { BomLine, LineStatus, Switches } from "@/lib/engine";

export interface DocumentInfo {
  file: string;
  /** How the lines were made, shown next to them: parsed, extracted, typed in. */
  provenance: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  document: DocumentInfo | null;
  lines: BomLine[];
  autoAcceptHigh: boolean;
  /** Alternatives chosen in the Alternatives tab. */
  switches: Switches;
  premiumPercent: number;
  /** Lines switched in the spend-vs-activity comparison. Null means the default: steel. */
  comparisonLineIds: string[] | null;
}

export type NewProject = Pick<Project, "name" | "document" | "lines"> & Partial<Pick<Project, "autoAcceptHigh">>;

interface State {
  projects: Project[];
}

const STORAGE_KEY = "carbon-takeoff:projects";
/** The single-project key from before there was a library. Read once and migrated. */
const LEGACY_KEY = "carbon-takeoff:project";
/** Undo history is in memory only: a reload keeps the projects but not their history. */
const HISTORY_LIMIT = 100;

const EMPTY: State = { projects: [] };

let state: State = EMPTY;
let loaded = false;
const history = new Map<string, { past: Project[]; future: Project[] }>();
const listeners = new Set<() => void>();

export function newId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 10);
}

function blankProject(init: NewProject): Project {
  const now = new Date().toISOString();
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    autoAcceptHigh: true,
    switches: {},
    premiumPercent: 15,
    comparisonLineIds: null,
    ...init,
  };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      state = { ...EMPTY, ...JSON.parse(stored) };
      return;
    }
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy);
      if (old.lines?.length) {
        const name = old.document?.file ?? "Imported project";
        state = { projects: [{ ...blankProject({ name, document: old.document, lines: old.lines }), ...old, name }] };
        persist();
      }
      window.localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    // Blocked or corrupt storage: start empty.
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Still works for this page view, just not after a reload.
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  load();
  return state;
}

function historyFor(id: string) {
  let h = history.get(id);
  if (!h) history.set(id, (h = { past: [], future: [] }));
  return h;
}

/** Replace one project. Recorded for undo unless record is false. */
function setProject(id: string, update: (p: Project) => Project, record = true) {
  const current = state.projects.find((p) => p.id === id);
  if (!current) return;
  const next = { ...update(current), updatedAt: new Date().toISOString() };
  if (record) {
    const h = historyFor(id);
    h.past = [...h.past.slice(-(HISTORY_LIMIT - 1)), current];
    h.future = [];
  }
  state = { ...state, projects: state.projects.map((p) => (p.id === id ? next : p)) };
  emit();
}

export function useProjects(): Project[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY).projects;
}

export function useProject(id: string): Project | undefined {
  return useProjects().find((p) => p.id === id);
}

/** False during the server render and hydration, so pages don't flash "not found". */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function useHistory(id: string) {
  // History changes only through setProject, which notifies, so reading it in render is safe.
  useProjects();
  const h = history.get(id);
  return { canUndo: Boolean(h?.past.length), canRedo: Boolean(h?.future.length) };
}

export const actions = {
  createProject(init: NewProject): string {
    load();
    const project = blankProject(init);
    state = { ...state, projects: [project, ...state.projects] };
    emit();
    return project.id;
  },
  duplicateProject(id: string): string | null {
    const source = state.projects.find((p) => p.id === id);
    if (!source) return null;
    const now = new Date().toISOString();
    const copy = { ...structuredClone(source), id: newId(), name: `${source.name} (copy)`, createdAt: now, updatedAt: now };
    state = { ...state, projects: [copy, ...state.projects] };
    emit();
    return copy.id;
  },
  deleteProject(id: string) {
    state = { ...state, projects: state.projects.filter((p) => p.id !== id) };
    history.delete(id);
    emit();
  },
  renameProject(id: string, name: string) {
    setProject(id, (p) => ({ ...p, name }));
  },
  undo(id: string): boolean {
    const h = history.get(id);
    const current = state.projects.find((p) => p.id === id);
    const previous = h?.past.at(-1);
    if (!h || !current || !previous) return false;
    h.past = h.past.slice(0, -1);
    h.future = [current, ...h.future];
    setProject(id, () => previous, false);
    return true;
  },
  redo(id: string): boolean {
    const h = history.get(id);
    const current = state.projects.find((p) => p.id === id);
    const next = h?.future[0];
    if (!h || !current || !next) return false;
    h.future = h.future.slice(1);
    h.past = [...h.past, current];
    setProject(id, () => next, false);
    return true;
  },
  updateLine(id: string, lineId: string, patch: Partial<BomLine>) {
    actions.updateLines(id, [lineId], patch);
  },
  updateLines(id: string, lineIds: string[], patch: Partial<BomLine>) {
    const set = new Set(lineIds);
    setProject(id, (p) => {
      const switches = { ...p.switches };
      // A new factor makes the old alternative meaningless.
      if ("factorId" in patch) for (const lineId of lineIds) delete switches[lineId];
      return { ...p, switches, lines: p.lines.map((l) => (set.has(l.id) ? { ...l, ...patch } : l)) };
    });
  },
  addLine(id: string, line: BomLine) {
    setProject(id, (p) => ({ ...p, lines: [...p.lines, line] }));
  },
  removeLines(id: string, lineIds: string[]) {
    const set = new Set(lineIds);
    setProject(id, (p) => {
      const switches = Object.fromEntries(Object.entries(p.switches).filter(([lineId]) => !set.has(lineId)));
      return { ...p, switches, lines: p.lines.filter((l) => !set.has(l.id)) };
    });
  },
  setStatus(id: string, lineIds: string[], status: LineStatus) {
    const set = new Set(lineIds);
    setProject(id, (p) => ({ ...p, lines: p.lines.map((l) => (set.has(l.id) ? { ...l, status } : l)) }));
  },
  setAutoAccept(id: string, autoAcceptHigh: boolean) {
    setProject(id, (p) => ({ ...p, autoAcceptHigh }));
  },
  setSwitches(id: string, switches: Switches) {
    setProject(id, (p) => ({ ...p, switches }));
  },
  setPremium(id: string, premiumPercent: number) {
    // A slider sends many values, which are not worth an undo step each.
    setProject(id, (p) => ({ ...p, premiumPercent }), false);
  },
  setComparisonLines(id: string, comparisonLineIds: string[]) {
    setProject(id, (p) => ({ ...p, comparisonLineIds }));
  },
};
