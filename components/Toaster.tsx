"use client";

import { actions } from "@/lib/store";
import { dismissToast, useToasts } from "@/lib/toast";
import { Icon } from "./Icon";

export function Toaster() {
  const toasts = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rise pointer-events-auto flex max-w-[min(32rem,100%)] items-center gap-3 rounded-xl bg-ink py-2.5 pr-2 pl-4 text-sm text-bg shadow-lg"
        >
          <span className="min-w-0 flex-1 truncate">{t.message}</span>
          {t.undoProjectId && (
            <button
              className="rounded-lg px-2.5 py-1 font-medium text-highlight hover:bg-white/10"
              onClick={() => {
                actions.undo(t.undoProjectId!);
                dismissToast(t.id);
              }}
            >
              Undo
            </button>
          )}
          <button className="rounded-lg p-1.5 opacity-60 hover:bg-white/10 hover:opacity-100" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
