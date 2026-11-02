import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, IBM_Plex_Sans_JP } from "next/font/google";
import "./globals.css";
import { getCurrentUser, listUsers } from "@/lib/data";
import { switchUser } from "@/lib/actions";
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
  title: { default: "Yokoten — IT Div. の困りごとと解決策を、横へ", template: "%s ｜ Yokoten" },
  description: "IT Div. のチームの困りごとと、ノーコード・ローコード・AI エージェントでの解決策を共有し、横展開するためのコミュニティ。",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [me, users] = [await getCurrentUser(), listUsers()];
  return (
    <html lang="ja" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <div className="backdrop" aria-hidden />
        <header className="header">
          <div className="wrap header__inner">
            <Link href="/" className="logo" aria-label="Yokoten ホーム">
              <span className="logo__word">Yokoten</span>
              <span className="logo__dot" />
              <span className="logo__sub">IT DIV.<br />KNOWLEDGE EXCHANGE</span>
            </Link>
            <NavLinks />
            <div className="header__right">
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
            <span className="mono dim">YOKOTEN / v0.1 — LOCAL PROTOTYPE</span>
            <span className="dim">チームの工夫を、IT Div. 全体の資産に。</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
