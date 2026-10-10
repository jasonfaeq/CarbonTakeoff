"use client";

import { useSyncExternalStore } from "react";

export interface Toast {
  id: number;
  message: string;
  /** Show an Undo button that reverts the last change in this project. */
  undoProjectId?: string;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const EMPTY: Toast[] = [];

function emit() {
  listeners.forEach((l) => l());
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** A short message at the bottom of the screen, gone after five seconds. Three at most. */
export function toast(message: string, options: { undoProjectId?: string } = {}) {
  const id = nextId++;
  toasts = [...toasts.slice(-2), { id, message, ...options }];
  emit();
  window.setTimeout(() => dismissToast(id), 5000);
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => EMPTY,
  );
}
