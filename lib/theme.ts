"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme-boot";

export type Theme = "system" | "light" | "dark";

const listeners = new Set<() => void>();

export function setTheme(theme: Theme) {
  try {
    if (theme === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Not remembered, but still applied for this page view.
  }
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  listeners.forEach((l) => l());
}

export function nextTheme(current: Theme): Theme {
  return current === "system" ? "light" : current === "light" ? "dark" : "system";
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (document.documentElement.dataset.theme as Theme | undefined) ?? "system",
    () => "system",
  );
}
