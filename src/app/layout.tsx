import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, IBM_Plex_Sans_JP } from "next/font/google";
import "./globals.css";
import { getCurrentUser, listUsers } from "@/lib/data";
import { switchUser } from "@/lib/actions";
import { getAdventurer } from "@/lib/game";
import { NavLinks } from "@/components/NavLinks";
import { UserSwitcher } from "@/components/UserSwitcher";

// 和文は IBM Plex Sans JP、数字と英字の札は IBM Plex Mono
const sans = IBM_Plex_Sans_JP({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
});
const mono = IBM_Plex_Mono({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "QuestForge — 悩みを、クエストに。閃きを、成果に。", template: "%s ｜ QuestForge" },
  description: "IT Div. の困りごとから、AI との壁打ちで解決策を企画し、成功事例を探し、共有して横展開するためのコミュニティ。",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [me, users] = [await getCurrentUser(), listUsers()];
  const hero = getAdventurer(me.id);
  return (
    <html lang="ja" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <div className="backdrop" aria-hidden />
        <header className="header">
          <div className="wrap header__inner">
            <Link href="/" className="logo" aria-label="QuestForge ホーム">
              <span className="logo__word">QuestForge</span>
              <span className="logo__dot" />
              <span className="logo__sub">IT DIV.<br />IDEA &amp; SOLUTION GUILD</span>
            </Link>
            <NavLinks />
            <div className="header__right">
              {hero && (
                <Link href="/ranking" className="lvchip" title={`${hero.title}・${hero.xp} XP`}>
                  <span className="lvchip__lv mono">Lv{hero.level}</span>
                  <span className="lvchip__bar"><span style={{ width: `${Math.round(hero.progress * 100)}%` }} /></span>
                </Link>
              )}
              <UserSwitcher users={users} currentId={me.id} action={switchUser} />
              <Link href="/new" className="btn btn--primary btn--sm">
                <span aria-hidden>＋</span> 投稿する
              </Link>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <div className="wrap footer__inner">
            <span className="mono dim">QUESTFORGE / v0.2 — LOCAL PROTOTYPE</span>
            <span className="dim">悩みを、クエストに。閃きを、成果に。</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
