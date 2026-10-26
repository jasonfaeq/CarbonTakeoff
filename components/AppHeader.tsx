import Link from "next/link";
import { CommandButton } from "./CommandButton";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./ui";

export function AppHeader() {
  return (
    <header className="ruler sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="logo-link flex items-center gap-2.5 font-semibold tracking-tight">
          <Logo size={26} />
          <span className="text-[15px]">Carbon Takeoff</span>
        </Link>
        <NavLinks />
        <div className="ml-auto flex items-center gap-1.5">
          <CommandButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
