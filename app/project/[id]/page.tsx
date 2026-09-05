"use client";

import { useCurrentProject } from "@/components/project/context";
import { Results } from "@/components/project/Results";

export default function OverviewPage() {
  const { project, totals } = useCurrentProject();
  return <Results lines={project.lines} totals={totals} />;
}
