"use client";

import { useEffect, useRef, useState } from "react";
import { downloadText, fileSlug, projectJson, resultsCsv } from "@/lib/export";
import { encodeShare } from "@/lib/share";
import type { Project } from "@/lib/store";
import { toast } from "@/lib/toast";
import { Icon } from "../Icon";

/** Links get long with big projects. Past this, browsers and chat apps start to mangle them. */
const LONG_LINK = 60_000;

export async function copyShareLink(project: Project) {
  const url = `${window.location.origin}/share#${await encodeShare(project)}`;
  try {
    await navigator.clipboard.writeText(url);
    toast(
      url.length > LONG_LINK ? "Link copied. It is very long; a project file may travel better." : "Share link copied. It carries the whole project.",
    );
  } catch {
    toast("The browser blocked the clipboard. Export a project file instead.");
  }
}

export function exportCsv(project: Project) {
  downloadText(`${fileSlug(project.name)}-results.csv`, resultsCsv(project));
}

export function exportJson(project: Project) {
  downloadText(`${fileSlug(project.name)}.carbon.json`, projectJson(project), "application/json");
}

export function ProjectActions({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative flex gap-1.5">
      <button className="btn btn-sm" onClick={() => copyShareLink(project)} title="Copy a link that opens a copy of this project">
        <Icon name="link" size={14} /> Share
      </button>
      <button className="btn btn-sm" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
        <Icon name="download" size={14} /> Export <Icon name="chevron-down" size={13} />
      </button>
      {open && (
        <div role="menu" className="rise absolute top-full right-0 z-30 mt-1.5 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-md">
          {[
            { label: "Results as CSV", hint: "Every line with its factor and working", run: () => exportCsv(project) },
            { label: "Project file (.json)", hint: "Re-import here or in another browser", run: () => exportJson(project) },
          ].map((item) => (
            <button
              key={item.label}
              role="menuitem"
              className="block w-full rounded-lg px-3 py-2 text-left hover:bg-surface-2"
              onClick={() => {
                item.run();
                setOpen(false);
              }}
            >
              <span className="block text-sm">{item.label}</span>
              <span className="block text-xs text-ink-3">{item.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
