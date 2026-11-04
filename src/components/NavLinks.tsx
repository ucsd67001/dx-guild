"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ホームへはロゴから戻る。管理者の「ギルマスの部屋」は、メニューに入れず、ヘッダー右の小さなリンクから（layout.tsx）
const LINKS = [
  { href: "/explore", label: "事例を探す", en: "CASES" },
  { href: "/forge", label: "賢者と壁打ち", en: "FORGE" },
  { href: "/community", label: "コミュニティ", en: "COMMUNITY" },
  { href: "/me", label: "マイページ", en: "MY PAGE" },
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
