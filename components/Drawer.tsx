"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

/** A panel that slides in from the right. A native dialog, so focus and Escape behave. */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="drawer"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-start gap-3 border-b border-line px-6 py-5">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg leading-snug font-semibold tracking-tight">{title}</h2>
              {subtitle && <div className="mt-1 text-sm text-ink-3">{subtitle}</div>}
            </div>
            <button className="btn btn-ghost btn-icon -mt-1 -mr-2" onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="border-t border-line bg-surface-2/50 px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
