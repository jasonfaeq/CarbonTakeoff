"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { ProjectProvider } from "@/components/project/context";
import { ProjectShell } from "@/components/project/ProjectShell";
import { EmptyState } from "@/components/ui";
import { catalogue } from "@/lib/catalogue";
import { computeTotals } from "@/lib/engine";
import { useHydrated, useProject } from "@/lib/store";

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const hydrated = useHydrated();
  const [openLineId, openLine] = useState<string | null>(null);
  const autoAcceptHigh = project?.autoAcceptHigh ?? true;
  const options = useMemo(() => ({ autoAcceptHigh }), [autoAcceptHigh]);
  const lines = project?.lines;
  const totals = useMemo(() => computeTotals(lines ?? [], catalogue, options), [lines, options]);

  if (!hydrated) return null;
  if (!project) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon="folder"
          title="Project not found"
          action={
            <Link href="/" className="btn btn-primary">
              All projects
            </Link>
          }
        >
          It may have been deleted, or it was saved in another browser. Projects live in the browser they were made in.
        </EmptyState>
      </main>
    );
  }
  return (
    <ProjectProvider value={{ project, options, totals, openLineId, openLine }}>
      <ProjectShell>{children}</ProjectShell>
    </ProjectProvider>
  );
}
