import Link from "next/link";
import { CommandButton } from "./CommandButton";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./ui";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <Logo size={26} />
          <span className="text-[15px]">Carbon Takeoff</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          <Link href="/" className="rounded-lg px-2.5 py-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink">
            Projects
          </Link>
          <Link href="/compare" className="rounded-lg px-2.5 py-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink">
            Compare
          </Link>
          <Link href="/factors" className="rounded-lg px-2.5 py-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink">
            Factors
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <CommandButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
