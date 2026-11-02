"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ホームへはロゴから戻る
const LINKS = [
  { href: "/explore", label: "クエスト", en: "QUESTS" },
  { href: "/forge", label: "賢者の工房", en: "FORGE" },
  { href: "/teams", label: "ギルド", en: "GUILDS" },
  { href: "/ranking", label: "ランキング", en: "RANKING" },
  { href: "/admin", label: "司令室", en: "ADMIN" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="メインメニュー">
      {LINKS.map((l) => {
        const active = path.startsWith(l.href) || (l.href === "/explore" && path.startsWith("/posts"));
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
