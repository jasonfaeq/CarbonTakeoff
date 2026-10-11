"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { tonnes } from "@/lib/format";
import { actions, useHistory } from "@/lib/store";
import { Icon, type IconName } from "../Icon";
import { PlaceholderNotice } from "../ui";
import { useCurrentProject } from "./context";
import { LineDrawer } from "./LineDrawer";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const NAV: NavItem[] = [
  { href: "", label: "Overview", icon: "overview" },
  { href: "/lines", label: "Lines", icon: "list" },
  { href: "/scenarios", label: "Scenarios", icon: "branch" },
  { href: "/transport", label: "Transport (A4)", icon: "truck" },
  { href: "/spend", label: "Spend vs activity", icon: "scale" },
];

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));
}

export function ProjectShell({ children }: { children: ReactNode }) {
  const { project, totals } = useCurrentProject();
  const { id, lines, document } = project;
  const { canUndo, canRedo } = useHistory(id);
  const pathname = usePathname();
  const router = useRouter();
  const base = `/project/${id}`;
  const decided = lines.length - totals.pendingLines;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target) || window.document.querySelector("dialog[open]")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) actions.redo(id);
        else actions.undo(id);
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && /^[1-9]$/.test(e.key)) {
        const item = NAV[Number(e.key) - 1];
        if (item) router.push(`/project/${id}${item.href}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, router]);

  const nav = NAV.map((item) => {
    const href = base + item.href;
    const current = item.href === "" ? pathname === base : pathname.startsWith(href);
    return { ...item, href, current };
  });

  return (
    <div className="mx-auto grid w-full max-w-[1400px] flex-1 gap-x-8 px-4 sm:px-6 lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-14 flex max-h-[calc(100vh-3.5rem)] flex-col gap-6 overflow-y-auto py-6">
          <Link href="/" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink">
            <Icon name="arrow-left" size={14} /> All projects
          </Link>
          <nav aria-label="Project" className="grid gap-0.5">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.current ? "page" : undefined}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-surface aria-[current=page]:font-medium aria-[current=page]:text-ink aria-[current=page]:shadow-sm"
              >
                <Icon name={item.icon} size={16} className={item.current ? "text-brand" : "text-ink-3"} />
                {item.label}
                {item.href.endsWith("/lines") && totals.pendingLines > 0 && (
                  <span className="badge ml-auto" data-tone="warn">
                    {totals.pendingLines}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="card p-4">
            <span className="eyebrow">Review progress</span>
            <div className="num mt-2 text-sm">
              <span className="font-semibold">{decided}</span> <span className="text-ink-3">of {lines.length} lines decided</span>
            </div>
            <div className="meter mt-2.5" role="progressbar" aria-valuemin={0} aria-valuemax={lines.length} aria-valuenow={decided}>
              <span className="bg-brand" style={{ width: `${lines.length ? (decided / lines.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 pt-6 pb-16">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <input
              key={project.name}
              aria-label="Project name"
              defaultValue={project.name}
              className="-ml-1.5 w-full max-w-xl rounded-lg bg-transparent px-1.5 text-[26px] font-semibold tracking-tight hover:bg-surface-2 focus:bg-surface focus:outline-none"
              onBlur={(e) => {
                const name = e.target.value.trim();
                if (name && name !== project.name) actions.renameProject(id, name);
              }}
            />
            {document && (
              <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-ink-3">
                <Icon name="file" size={14} />
                {document.file} · {document.provenance}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/report/${id}`} className="btn btn-sm">
              <Icon name="printer" size={14} /> Report
            </Link>
            <div className="flex gap-1">
              <button
                className="btn btn-ghost btn-sm btn-icon"
                disabled={!canUndo}
                onClick={() => actions.undo(id)}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <Icon name="undo" size={15} />
              </button>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                disabled={!canRedo}
                onClick={() => actions.redo(id)}
                title="Redo (Ctrl+Shift+Z)"
                aria-label="Redo"
              >
                <Icon name="redo" size={15} />
              </button>
            </div>
            <div className="text-right" aria-live="polite">
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="num text-[28px] leading-none font-semibold tracking-tight">{tonnes(totals.kgCO2e)}</span>
                <span className="text-sm text-ink-3">tCO₂e</span>
              </div>
              <p className="mt-1 text-xs text-ink-3">
                {totals.countedLines} of {lines.length} lines counted
              </p>
            </div>
          </div>
        </header>

        <nav aria-label="Project" className="-mx-4 mt-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className="-mb-px flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-2.5 py-2.5 text-sm text-ink-3 aria-[current=page]:border-brand aria-[current=page]:font-medium aria-[current=page]:text-ink"
            >
              <Icon name={item.icon} size={15} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-4">
          <PlaceholderNotice />
        </div>
        <div className="mt-5">{children}</div>
      </div>
      <LineDrawer />
    </div>
  );
}
