"use client";

import { useSyncExternalStore } from "react";
import type { BomLine, LineStatus, Switches } from "@/lib/engine";
import type { SharedProject } from "@/lib/share";

export interface DocumentInfo {
  file: string;
  /** How the lines were made, shown next to them: parsed, extracted, typed in. */
  provenance: string;
}

/** A named set of alternative factors, line id to factor id. */
export interface Scenario {
  id: string;
  name: string;
  switches: Switches;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  document: DocumentInfo | null;
  lines: BomLine[];
  autoAcceptHigh: boolean;
  scenarios: Scenario[];
  activeScenarioId: string | null;
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
    scenarios: [],
    activeScenarioId: null,
    premiumPercent: 15,
    comparisonLineIds: null,
    ...init,
  };
}

/** Bring a project saved by an older version up to the current shape. */
export function migrateProject(raw: Record<string, unknown>): Project {
  const p = { ...raw } as unknown as Project & { switches?: Switches };
  if (!Array.isArray(p.scenarios)) {
    const old = p.switches ?? {};
    p.scenarios = Object.keys(old).length > 0 ? [{ id: newId(), name: "Low-carbon", switches: old }] : [];
    p.activeScenarioId = p.scenarios[0]?.id ?? null;
  }
  delete p.switches;
  if (!p.scenarios.some((s) => s.id === p.activeScenarioId)) p.activeScenarioId = p.scenarios[0]?.id ?? null;
  return p;
}

export function activeScenario(project: Project): Scenario | null {
  return project.scenarios.find((s) => s.id === project.activeScenarioId) ?? null;
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { projects?: Record<string, unknown>[] };
      state = { projects: (parsed.projects ?? []).map(migrateProject) };
      return;
    }
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy);
      if (old.lines?.length) {
        const name = old.document?.file ?? "Imported project";
        state = { projects: [migrateProject({ ...blankProject({ name, document: old.document, lines: old.lines }), ...old, name })] };
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

/** Drop the chosen alternatives of these lines from every scenario. */
function withoutSwitches(p: Project, lineIds: Set<string>): Scenario[] {
  return p.scenarios.map((s) => ({ ...s, switches: Object.fromEntries(Object.entries(s.switches).filter(([lineId]) => !lineIds.has(lineId))) }));
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
  /** Save a project that arrived as a file or a share link, under a new id. */
  importProject(shared: SharedProject): string {
    load();
    const now = new Date().toISOString();
    const base = blankProject({ name: shared.name, document: null, lines: [] });
    const project = migrateProject({ ...base, ...shared, id: base.id, createdAt: now, updatedAt: now });
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
    setProject(id, (p) => ({
      ...p,
      // A new factor makes the old alternatives meaningless.
      scenarios: "factorId" in patch ? withoutSwitches(p, set) : p.scenarios,
      lines: p.lines.map((l) => (set.has(l.id) ? { ...l, ...patch } : l)),
    }));
  },
  addLine(id: string, line: BomLine) {
    setProject(id, (p) => ({ ...p, lines: [...p.lines, line] }));
  },
  removeLines(id: string, lineIds: string[]) {
    const set = new Set(lineIds);
    setProject(id, (p) => ({ ...p, scenarios: withoutSwitches(p, set), lines: p.lines.filter((l) => !set.has(l.id)) }));
  },
  setStatus(id: string, lineIds: string[], status: LineStatus) {
    const set = new Set(lineIds);
    setProject(id, (p) => ({ ...p, lines: p.lines.map((l) => (set.has(l.id) ? { ...l, status } : l)) }));
  },
  setAutoAccept(id: string, autoAcceptHigh: boolean) {
    setProject(id, (p) => ({ ...p, autoAcceptHigh }));
  },
  createScenario(id: string, name: string, switches: Switches = {}): string {
    const scenario = { id: newId(), name, switches };
    setProject(id, (p) => ({ ...p, scenarios: [...p.scenarios, scenario], activeScenarioId: scenario.id }));
    return scenario.id;
  },
  duplicateScenario(id: string, scenarioId: string): string | null {
    const project = state.projects.find((p) => p.id === id);
    const source = project?.scenarios.find((s) => s.id === scenarioId);
    if (!source) return null;
    return actions.createScenario(id, `${source.name} (copy)`, { ...source.switches });
  },
  renameScenario(id: string, scenarioId: string, name: string) {
    setProject(id, (p) => ({ ...p, scenarios: p.scenarios.map((s) => (s.id === scenarioId ? { ...s, name } : s)) }));
  },
  deleteScenario(id: string, scenarioId: string) {
    setProject(id, (p) => {
      const scenarios = p.scenarios.filter((s) => s.id !== scenarioId);
      return { ...p, scenarios, activeScenarioId: p.activeScenarioId === scenarioId ? (scenarios[0]?.id ?? null) : p.activeScenarioId };
    });
  },
  setActiveScenario(id: string, scenarioId: string) {
    setProject(id, (p) => ({ ...p, activeScenarioId: scenarioId }), false);
  },
  setScenarioSwitches(id: string, scenarioId: string, switches: Switches) {
    setProject(id, (p) => ({ ...p, scenarios: p.scenarios.map((s) => (s.id === scenarioId ? { ...s, switches } : s)) }));
  },
  /** Choose an alternative for one line in the active scenario, making a scenario if there is none. */
  setSwitch(id: string, lineId: string, factorId: string | null) {
    const project = state.projects.find((p) => p.id === id);
    if (!project) return;
    let scenario = activeScenario(project);
    if (!scenario) {
      if (!factorId) return;
      actions.createScenario(id, "Low-carbon");
      scenario = activeScenario(state.projects.find((p) => p.id === id)!)!;
    }
    const switches = { ...scenario.switches };
    if (factorId) switches[lineId] = factorId;
    else delete switches[lineId];
    actions.setScenarioSwitches(id, scenario.id, switches);
  },
  setPremium(id: string, premiumPercent: number) {
    // A slider sends many values, which are not worth an undo step each.
    setProject(id, (p) => ({ ...p, premiumPercent }), false);
  },
  setComparisonLines(id: string, comparisonLineIds: string[]) {
    setProject(id, (p) => ({ ...p, comparisonLineIds }));
  },
};
