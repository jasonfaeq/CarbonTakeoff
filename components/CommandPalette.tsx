"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { catalogue } from "@/lib/catalogue";
import { DEMOS } from "@/lib/demos";
import { HIGH_CONFIDENCE, switchAll } from "@/lib/engine";
import { loadDemo } from "@/lib/load-demo";
import { actions, useProjects } from "@/lib/store";
import { setTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { Icon, type IconName } from "./Icon";
import { copyShareLink, exportCsv, exportJson } from "./project/ProjectActions";
import { openWelcome } from "./Welcome";

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: IconName;
  keys?: string;
  run: () => void;
}

const listeners = new Set<() => void>();
let open = false;

export function openCommandPalette() {
  open = true;
  listeners.forEach((l) => l());
}

function closePalette() {
  open = false;
  listeners.forEach((l) => l());
}

function useOpen() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
    () => false,
  );
}

/** Words must all appear, in any order; a match at the start of the label ranks first. */
function score(command: Command, query: string): number {
  if (!query) return 1;
  const text = `${command.label} ${command.group} ${command.hint ?? ""}`.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.every((w) => text.includes(w))) return 0;
  return command.label.toLowerCase().startsWith(words[0]) ? 2 : 1;
}

export function CommandPalette() {
  const isOpen = useOpen();
  const router = useRouter();
  const pathname = usePathname();
  const projects = useProjects();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const projectId = pathname.match(/^\/project\/([^/]+)/)?.[1] ?? null;
  const project = projects.find((p) => p.id === projectId);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) closePalette();
        else openCommandPalette();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (isOpen && !el.open) {
      el.showModal();
    } else if (!isOpen && el.open) el.close();
  }, [isOpen]);

  const commands = useMemo<Command[]>(() => {
    const out: Command[] = [];
    const go = (href: string) => () => router.push(href);
    if (project) {
      const base = `/project/${project.id}`;
      out.push(
        { id: "nav-overview", group: project.name, label: "Overview", icon: "overview", keys: "1", run: go(base) },
        { id: "nav-lines", group: project.name, label: "Lines", icon: "list", keys: "2", run: go(`${base}/lines`) },
        { id: "nav-scenarios", group: project.name, label: "Scenarios", icon: "branch", keys: "3", run: go(`${base}/scenarios`) },
        { id: "nav-transport", group: project.name, label: "Transport (A4)", icon: "truck", keys: "4", run: go(`${base}/transport`) },
        { id: "nav-spend", group: project.name, label: "Spend vs activity", icon: "scale", keys: "5", run: go(`${base}/spend`) },
        {
          id: "accept-high",
          group: project.name,
          label: "Accept all high-confidence lines",
          icon: "check",
          run: () => {
            const ids = project.lines.filter((l) => l.status === "pending" && l.factorId && l.confidence >= HIGH_CONFIDENCE).map((l) => l.id);
            actions.setStatus(project.id, ids, "accepted");
            toast(`${ids.length} lines accepted.`, { undoProjectId: project.id });
          },
        },
        {
          id: "switch-all",
          group: project.name,
          label: "New scenario: switch everything to the lowest sourced factor",
          icon: "leaf",
          run: () => {
            const switches = switchAll(project.lines, catalogue, { autoAcceptHigh: project.autoAcceptHigh });
            actions.createScenario(project.id, "Lowest sourced", switches);
            router.push(`${base}/scenarios`);
          },
        },
        { id: "report", group: project.name, label: "Open the printable report", icon: "printer", run: go(`/report/${project.id}`) },
        { id: "share", group: project.name, label: "Copy a share link", icon: "link", run: () => copyShareLink(project) },
        { id: "export-csv", group: project.name, label: "Export results as CSV", icon: "download", run: () => exportCsv(project) },
        { id: "export-json", group: project.name, label: "Export the project file", icon: "download", run: () => exportJson(project) },
        { id: "undo", group: project.name, label: "Undo", icon: "undo", keys: "Ctrl Z", run: () => actions.undo(project.id) },
        { id: "redo", group: project.name, label: "Redo", icon: "redo", keys: "Ctrl Shift Z", run: () => actions.redo(project.id) },
        {
          id: "duplicate",
          group: project.name,
          label: "Duplicate this project",
          icon: "copy",
          run: () => {
            const id = actions.duplicateProject(project.id);
            if (id) router.push(`/project/${id}`);
          },
        },
        {
          id: "delete",
          group: project.name,
          label: "Delete this project",
          icon: "trash",
          run: () => {
            if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
              actions.deleteProject(project.id);
              router.push("/");
            }
          },
        },
      );
    }
    out.push({ id: "home", group: "Go to", label: "All projects", icon: "folder", run: go("/") });
    out.push({ id: "compare", group: "Go to", label: "Compare projects", icon: "columns", run: go("/compare") });
    out.push({ id: "factors", group: "Go to", label: "Factor library", icon: "book", run: go("/factors") });
    for (const p of projects) {
      if (p.id === project?.id) continue;
      out.push({ id: `open-${p.id}`, group: "Open project", label: p.name, hint: p.document?.file, icon: "file", run: go(`/project/${p.id}`) });
    }
    for (const demo of DEMOS) {
      out.push({
        id: `demo-${demo.id}`,
        group: "Demos",
        label: `Open demo: ${demo.title}`,
        hint: demo.subtitle,
        icon: demo.icon,
        run: async () => {
          const id = await loadDemo(demo);
          router.push(`/project/${id}/lines`);
        },
      });
    }
    out.push(
      { id: "theme-light", group: "Theme", label: "Light theme", icon: "sun", run: () => setTheme("light") },
      { id: "theme-dark", group: "Theme", label: "Dark theme", icon: "moon", run: () => setTheme("dark") },
      { id: "theme-system", group: "Theme", label: "Theme follows the system", icon: "monitor", run: () => setTheme("system") },
      { id: "welcome", group: "Help", label: "Show the welcome window", hint: "How it works", icon: "info", run: openWelcome },
    );
    return out;
  }, [project, projects, router]);

  const shown = commands
    .map((c) => ({ c, s: score(c, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.c);
  const active = Math.min(index, Math.max(shown.length - 1, 0));

  function run(command: Command | undefined) {
    if (!command) return;
    closePalette();
    setQuery("");
    setIndex(0);
    command.run();
  }

  const rows = shown.map((c, i) => ({ c, header: i === 0 || shown[i - 1].group !== c.group ? c.group : null }));
  return (
    <dialog
      ref={dialog}
      className="dialog mt-[12vh] w-[min(40rem,calc(100vw-2rem))]"
      onClose={closePalette}
      onClick={(e) => {
        if (e.target === dialog.current) closePalette();
      }}
    >
      {isOpen && (
        <div
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex(Math.min(active + 1, shown.length - 1));
              list.current?.children[Math.min(active + 1, shown.length - 1)]?.scrollIntoView({ block: "nearest" });
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex(Math.max(active - 1, 0));
              list.current?.children[Math.max(active - 1, 0)]?.scrollIntoView({ block: "nearest" });
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(shown[active]);
            }
          }}
        >
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Icon name="search" size={17} className="text-ink-3" />
            <input
              autoFocus
              aria-label="Search commands"
              className="h-13 w-full bg-transparent text-[15px] outline-none placeholder:text-ink-3"
              placeholder="Search commands, projects and demos"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIndex(0);
              }}
            />
            <kbd className="kbd">Esc</kbd>
          </div>
          <ul ref={list} role="listbox" aria-label="Commands" className="max-h-[52vh] overflow-y-auto p-2">
            {shown.length === 0 && <li className="px-3 py-8 text-center text-sm text-ink-3">No command matches.</li>}
            {rows.map(({ c, header }, i) => {
              return (
                <li key={c.id} role="option" aria-selected={i === active}>
                  {header && <div className="eyebrow px-3 pt-3 pb-1.5">{header}</div>}
                  <button
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === active ? "bg-surface-2 text-ink" : "text-ink-2"}`}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => run(c)}
                  >
                    <Icon name={c.icon} size={16} className="text-ink-3" />
                    <span className="min-w-0 flex-1 truncate">
                      {c.label}
                      {c.hint && <span className="ml-2 text-xs text-ink-3">{c.hint}</span>}
                    </span>
                    {c.keys && <kbd className="kbd">{c.keys}</kbd>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-xs text-ink-3">
            <span>
              <kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> move
            </span>
            <span>
              <kbd className="kbd">Enter</kbd> run
            </span>
            <span className="ml-auto">
              <kbd className="kbd">Ctrl</kbd> <kbd className="kbd">K</kbd> anywhere
            </span>
          </div>
        </div>
      )}
    </dialog>
  );
}
