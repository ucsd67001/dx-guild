"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "ホーム", en: "HOME" },
  { href: "/explore", label: "探す", en: "EXPLORE" },
  { href: "/teams", label: "チーム", en: "TEAMS" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="メインメニュー">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? "is-active" : undefined}>
            <span className="nav__en">{l.en}</span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
