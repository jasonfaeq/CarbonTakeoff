"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DEMOS } from "@/lib/demos";
import { GROUP_ORDER, groupStyle } from "@/lib/groups";
import { loadDemo } from "@/lib/load-demo";
import { hatchId } from "./Hatch";
import { Icon, type IconName } from "./Icon";
import { Logo } from "./ui";

const SEEN_KEY = "carbon-takeoff:welcomed";

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "upload", title: "Bring a BOM or a spec", text: "CSV, XLSX or a PDF specification. Spreadsheets are read in your browser." },
  { icon: "check", title: "Review every match", text: "Each line shows the factor it matched, its source and how sure the match is." },
  { icon: "leaf", title: "Find the hotspots", text: "See where the carbon sits and which sourced alternatives would lower it." },
];

const listeners = new Set<() => void>();
let open = false;

export function openWelcome() {
  open = true;
  listeners.forEach((l) => l());
}

function setOpen(next: boolean) {
  open = next;
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

function remember() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Shows again next visit; nothing else depends on it.
  }
}

/** Shown once, on the first visit to the home page. The command palette brings it back. */
export function Welcome() {
  const isOpen = useOpen();
  const pathname = usePathname();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pathname !== "/") return;
    let seen = false;
    try {
      seen = window.localStorage.getItem(SEEN_KEY) !== null;
    } catch {
      seen = false;
    }
    if (!seen) setOpen(true);
  }, [pathname]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (isOpen && !el.open) el.showModal();
    else if (!isOpen && el.open) el.close();
  }, [isOpen]);

  function close() {
    remember();
    setOpen(false);
  }

  async function startDemo() {
    const demo = DEMOS.find((d) => d.id === "wind-foundation");
    if (!demo) return;
    setLoading(true);
    try {
      const id = await loadDemo(demo);
      close();
      router.push(`/project/${id}/lines`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="welcome-title"
      className="dialog w-[min(38rem,calc(100vw-2rem))] overflow-hidden"
      onClose={close}
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
    >
      {isOpen && (
        <>
          {/* Every material hatch in a row, the way they appear in the charts. */}
          <svg aria-hidden="true" className="block h-3 w-full">
            {GROUP_ORDER.map((g, i) => (
              <rect
                key={g}
                x={`${(i / GROUP_ORDER.length) * 100}%`}
                width={`${100 / GROUP_ORDER.length + 0.1}%`}
                height="100%"
                style={{ fill: `url(#${hatchId(groupStyle(g).hatch)})` }}
              />
            ))}
          </svg>
          <div className="drafting relative px-6 pt-6 pb-5 sm:px-8">
            <button className="btn btn-ghost btn-icon absolute top-3 right-3" onClick={close} aria-label="Close">
              <Icon name="x" />
            </button>
            <Logo size={40} />
            <h2 id="welcome-title" className="mt-4 text-[26px] leading-tight font-semibold tracking-[-0.02em]">
              Welcome to Carbon Takeoff
            </h2>
            <p className="mt-2 max-w-md text-[15px] text-ink-2">
              Embodied-carbon screening for bills of materials and specifications, with a source behind every factor.
            </p>
          </div>
          <ol className="grid gap-px border-y border-line bg-line sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="bg-surface px-6 py-5 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand-soft-ink">
                    <Icon name={s.icon} size={16} />
                  </span>
                  <span className="font-mono text-[11px] tracking-[0.08em] text-ink-3">STEP {i + 1}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1 text-[13px] text-ink-2">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="space-y-2 px-6 py-4 text-[13px] text-ink-2 sm:px-8">
            <p className="flex items-start gap-2">
              <Icon name="info" size={14} className="mt-0.5 shrink-0 text-ink-3" />
              <span>
                A screening estimate (A1–A3), not a full LCA. Projects stay in this browser, and the demos are synthetic data.
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Icon name="command" size={14} className="shrink-0 text-ink-3" />
              <span>
                <kbd className="kbd">Ctrl</kbd> <kbd className="kbd">K</kbd> opens every command, and this window again.
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2/50 px-6 py-4 sm:px-8">
            <button className="btn" onClick={close}>
              Look around first
            </button>
            <button className="btn btn-primary" onClick={startDemo} disabled={loading}>
              {loading ? "Opening…" : "Open the wind demo"}
              {!loading && <Icon name="arrow-right" size={15} />}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
