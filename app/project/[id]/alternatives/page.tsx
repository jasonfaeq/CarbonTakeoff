"use client";

import { Alternatives } from "@/components/project/Alternatives";
import { useCurrentProject } from "@/components/project/context";

export default function AlternativesPage() {
  const { project, options } = useCurrentProject();
  return <Alternatives projectId={project.id} lines={project.lines} switches={project.switches} options={options} />;
}
