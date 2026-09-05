"use client";

import { useCurrentProject } from "@/components/project/context";
import { SpendVsActivity } from "@/components/project/SpendVsActivity";

export default function SpendPage() {
  const { project, options } = useCurrentProject();
  return (
    <SpendVsActivity
      projectId={project.id}
      lines={project.lines}
      options={options}
      premiumPercent={project.premiumPercent}
      lineIds={project.comparisonLineIds}
    />
  );
}
