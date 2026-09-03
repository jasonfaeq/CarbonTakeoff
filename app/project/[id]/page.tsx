"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";
import { EmptyState } from "@/components/ui";
import { useHydrated, useProject } from "@/lib/store";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const hydrated = useHydrated();
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
  return <ProjectWorkspace project={project} />;
}
