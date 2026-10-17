"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { EmptyState } from "@/components/ui";
import { decodeShare, ShareError, type SharedProject } from "@/lib/share";
import { actions } from "@/lib/store";

type State = { kind: "loading" } | { kind: "ready"; project: SharedProject } | { kind: "error"; message: string };

export default function SharePage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const hash = window.location.hash;
    const read = hash.length < 2 ? Promise.reject(new ShareError("This link has no project in it.")) : decodeShare(hash);
    read
      .then((project) => setState({ kind: "ready", project }))
      .catch((e) => setState({ kind: "error", message: e instanceof ShareError ? e.message : "This link could not be read." }));
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      {state.kind === "loading" && <div className="h-48 animate-pulse rounded-2xl bg-surface-2" />}
      {state.kind === "error" && (
        <EmptyState
          icon="link"
          title="Can't open this link"
          action={
            <Link href="/" className="btn btn-primary">
              All projects
            </Link>
          }
        >
          {state.message}
        </EmptyState>
      )}
      {state.kind === "ready" && (
        <div className="card p-8">
          <p className="eyebrow">Shared project</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{state.project.name}</h1>
          <p className="mt-2 text-sm text-ink-2">
            {state.project.lines.length} lines
            {Array.isArray(state.project.scenarios) && state.project.scenarios.length > 0 && ` · ${state.project.scenarios.length} scenarios`}.
            Importing saves a copy in this browser. Nothing was uploaded to get here: the whole project is inside the link.
          </p>
          <div className="mt-6 flex gap-2">
            <button
              className="btn btn-primary"
              onClick={() => {
                const id = actions.importProject(state.project);
                router.push(`/project/${id}`);
              }}
            >
              <Icon name="download" size={15} /> Import a copy
            </button>
            <Link href="/" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
