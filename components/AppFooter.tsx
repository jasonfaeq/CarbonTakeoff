import { WelcomeLink } from "./WelcomeLink";

export function AppFooter() {
  return (
    <footer className="no-print border-t border-line">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-5 text-xs text-ink-3 sm:px-6">
        <span>
          Carbon Takeoff · embodied-carbon screening, not an LCA · <WelcomeLink />
        </span>
        <span>
          Made by <span className="font-medium text-ink-2">Jason Faeq</span> · © {new Date().getFullYear()} · All rights reserved
        </span>
      </div>
    </footer>
  );
}
