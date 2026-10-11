"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Report } from "@/components/report/Report";
import { EmptyState } from "@/components/ui";
import { useHydrated, useProject } from "@/lib/store";

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const hydrated = useHydrated();
  if (!hydrated) return null;
  if (!project) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <EmptyState
          icon="printer"
          title="Project not found"
          action={
            <Link href="/" className="btn btn-primary">
              All projects
            </Link>
          }
        >
          Reports are made from projects saved in this browser.
        </EmptyState>
      </main>
    );
  }
  return <Report project={project} />;
}
