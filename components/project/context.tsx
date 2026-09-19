"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CalcOptions, Totals } from "@/lib/engine";
import type { Project } from "@/lib/store";

export interface ProjectContextValue {
  project: Project;
  options: CalcOptions;
  totals: Totals;
  /** The line shown in the detail drawer, if any. */
  openLineId: string | null;
  openLine: (lineId: string | null) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ value, children }: { value: ProjectContextValue; children: ReactNode }) {
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

/** The project the current /project/[id] route is showing. Only valid inside its layout. */
export function useCurrentProject(): ProjectContextValue {
  const value = useContext(ProjectContext);
  if (!value) throw new Error("useCurrentProject must be used inside the project layout");
  return value;
}
