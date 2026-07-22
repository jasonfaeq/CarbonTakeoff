"use client";

import { useSyncExternalStore } from "react";
import type { BomLine, LineStatus } from "@/lib/engine";

export interface DocumentInfo {
  file: string;
  /** How the lines were made, shown next to them: parsed, extracted, typed in. */
  provenance: string;
}

export interface ProjectState {
  lines: BomLine[];
  document: DocumentInfo | null;
  autoAcceptHigh: boolean;
}

const STORAGE_KEY = "carbon-takeoff:project";

const initial: ProjectState = { lines: [], document: null, autoAcceptHigh: true };

let state: ProjectState = initial;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) state = { ...initial, ...JSON.parse(stored) };
  } catch {
    // Blocked or corrupt storage: start empty.
  }
}

function setState(next: ProjectState) {
  state = next;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

export const actions = {
  loadDocument(lines: BomLine[], document: DocumentInfo, autoAcceptHigh = true) {
    setState({ lines, document, autoAcceptHigh });
  },
  updateLine(id: string, patch: Partial<BomLine>) {
    setState({ ...state, lines: state.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  },
  setStatus(ids: string[], status: LineStatus) {
    const set = new Set(ids);
    setState({ ...state, lines: state.lines.map((l) => (set.has(l.id) ? { ...l, status } : l)) });
  },
  setAutoAccept(autoAcceptHigh: boolean) {
    setState({ ...state, autoAcceptHigh });
  },
  reset() {
    setState(initial);
  },
};
