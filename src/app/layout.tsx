import type { Metadata } from "next";
import Link from "next/link";
import { Chakra_Petch, IBM_Plex_Mono, IBM_Plex_Sans_JP } from "next/font/google";
import "./globals.css";
import { PRODUCT } from "@/lib/constants";
import { getCurrentUser, listUsers } from "@/lib/data";
import { switchUser } from "@/lib/actions";
import { getAdventurer } from "@/lib/game";
import { NavLinks } from "@/components/NavLinks";
import { UserSwitcher } from "@/components/UserSwitcher";

// 和文は IBM Plex Sans JP。英字の札・見出しの数字は Chakra Petch（HUD らしい角ばった字）、表の小さな数字は IBM Plex Mono
const sans = IBM_Plex_Sans_JP({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
});
const mono = IBM_Plex_Mono({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-mono", display: "swap" });
const display = Chakra_Petch({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${PRODUCT.name} — ${PRODUCT.tagline}`, template: `%s ｜ ${PRODUCT.name}` },
  description: "IT Div. の困りごとから、AI との壁打ちで解決策を企画し、成功事例を探し、共有して横展開するためのコミュニティ。",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [me, users] = [await getCurrentUser(), listUsers()];
  const hero = getAdventurer(me.id);
  return (
    <html lang="ja" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body>
        <div className="backdrop" aria-hidden />
        <header className="header">
          <div className="wrap header__inner">
            <Link href="/" className="logo" aria-label={`${PRODUCT.name} ホーム`}>
              <span className="logo__word">{PRODUCT.name}</span>
              <span className="logo__dot" />
              <span className="logo__sub">IT DIV.<br />IDEA &amp; SOLUTION GUILD</span>
            </Link>
            <NavLinks />
            <div className="header__right">
              {hero && (
                <Link href="/me" className="lvchip" title={`${hero.title}・${hero.xp} XP`}>
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
            <span className="mono dim">{PRODUCT.en} / {PRODUCT.version} — LOCAL PROTOTYPE</span>
            <span className="dim">{PRODUCT.tagline}</span>
            <span className="footer__links mono">
              <Link href="/admin">WATCHTOWER / 物見の塔</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
