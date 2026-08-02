"use client";

import { useSyncExternalStore } from "react";
import type { BomLine, LineStatus, Switches } from "@/lib/engine";

export interface DocumentInfo {
  file: string;
  /** How the lines were made, shown next to them: parsed, extracted, typed in. */
  provenance: string;
}

export interface ProjectState {
  lines: BomLine[];
  document: DocumentInfo | null;
  autoAcceptHigh: boolean;
  /** Alternatives chosen in the Alternatives tab. */
  switches: Switches;
  premiumPercent: number;
  /** Lines switched in the spend-vs-activity comparison. Null means the default: steel. */
  comparisonLineIds: string[] | null;
}

const STORAGE_KEY = "carbon-takeoff:project";
/** Undo history is in memory only: a reload keeps the project but not its history. */
const HISTORY_LIMIT = 100;

const initial: ProjectState = {
  lines: [],
  document: null,
  autoAcceptHigh: true,
  switches: {},
  premiumPercent: 15,
  comparisonLineIds: null,
};

let state: ProjectState = initial;
let loaded = false;
let past: ProjectState[] = [];
let future: ProjectState[] = [];
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) state = { ...initial, ...JSON.parse(stored) };
  } catch {
    // Blocked or corrupt storage: start empty.
  }
}

function setState(next: ProjectState, record = true) {
  if (record && next !== state) {
    past = [...past.slice(-(HISTORY_LIMIT - 1)), state];
    future = [];
  }
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Still works for this page view, just not after a reload.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProjectState(): ProjectState {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => initial,
  );
}

export function useHistory() {
  // past and future change only through setState, which notifies, so reading them in render is safe.
  useProjectState();
  return { canUndo: past.length > 0, canRedo: future.length > 0 };
}

export const actions = {
  undo(): boolean {
    const previous = past.at(-1);
    if (!previous) return false;
    past = past.slice(0, -1);
    future = [state, ...future];
    setState(previous, false);
    return true;
  },
  redo(): boolean {
    const next = future[0];
    if (!next) return false;
    future = future.slice(1);
    past = [...past, state];
    setState(next, false);
    return true;
  },
  loadDocument(lines: BomLine[], document: DocumentInfo, autoAcceptHigh = true) {
    setState({ ...initial, lines, document, autoAcceptHigh });
  },
  updateLine(id: string, patch: Partial<BomLine>) {
    const switches = { ...state.switches };
    // A new factor makes the old alternative meaningless.
    if ("factorId" in patch) delete switches[id];
    setState({ ...state, switches, lines: state.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  },
  setStatus(ids: string[], status: LineStatus) {
    const set = new Set(ids);
    setState({ ...state, lines: state.lines.map((l) => (set.has(l.id) ? { ...l, status } : l)) });
  },
  setSwitches(switches: Switches) {
    setState({ ...state, switches });
  },
  setPremium(premiumPercent: number) {
    // A slider sends many values, which are not worth an undo step each.
    setState({ ...state, premiumPercent }, false);
  },
  setComparisonLines(comparisonLineIds: string[]) {
    setState({ ...state, comparisonLineIds });
  },
  setAutoAccept(autoAcceptHigh: boolean) {
    setState({ ...state, autoAcceptHigh });
  },
  reset() {
    setState(initial);
  },
};
