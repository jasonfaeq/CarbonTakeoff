"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Projects", match: (p: string) => p === "/" || p.startsWith("/project") },
  { href: "/compare", label: "Compare", match: (p: string) => p.startsWith("/compare") },
  { href: "/factors", label: "Factors", match: (p: string) => p.startsWith("/factors") },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 text-sm sm:flex">
      {LINKS.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className="nav-link rounded-lg px-2.5 py-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink aria-[current=page]:text-ink"
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
