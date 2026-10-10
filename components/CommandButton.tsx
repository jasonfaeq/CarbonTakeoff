"use client";

import { openCommandPalette } from "./CommandPalette";
import { Icon } from "./Icon";

export function CommandButton() {
  return (
    <button
      className="btn btn-sm hidden gap-2 !pr-1.5 text-ink-3 sm:inline-flex"
      onClick={openCommandPalette}
      aria-label="Open the command palette"
      title="Command palette (Ctrl+K)"
    >
      <Icon name="search" size={14} />
      <span className="pr-6 text-[13px]">Search or run a command</span>
      <kbd className="kbd">Ctrl K</kbd>
    </button>
  );
}
