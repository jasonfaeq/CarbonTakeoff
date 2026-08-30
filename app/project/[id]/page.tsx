"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";
import { useHydrated, useProject } from "@/lib/store";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const hydrated = useHydrated();
  if (!hydrated) return null;
  if (!project) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <p className="mt-2 text-zinc-500">It may have been deleted, or it was saved in another browser.</p>
        <Link href="/" className="mt-4 inline-block underline underline-offset-4">
          All projects
        </Link>
      </main>
    );
  }
  return <ProjectWorkspace project={project} />;
}
