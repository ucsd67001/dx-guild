import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/data";
import { ALL_BADGES, XP_RULES, listAdventurers, listGuilds } from "@/lib/game";

export const metadata: Metadata = { title: "冒険者ランキング" };

export default async function Ranking() {
  const me = await getCurrentUser();
  const adventurers = listAdventurers();
  const guilds = listGuilds();
  const mine = adventurers.find((a) => a.userId === me.id)!;
  const rank = adventurers.indexOf(mine) + 1;
  const earned = new Set(mine.badges.map((b) => b.key));
  const maxGuild = Math.max(...guilds.map((g) => g.xp), 1);

  return (
    <div className="wrap page">
      <p className="eyebrow">ADVENTURERS&apos; GUILD</p>
      <h1 className="page__title">冒険者ランキング</h1>
      <p className="lead">困りごとを出す・解決策を共有する・よそのチームに横展開される。IT Div. を良くした行いが、経験値（XP）になります。</p>

      {/* あなたのステータス */}
      <section className="status-card">
        <div className="status-card__main">
          <span className="crest mono" aria-hidden>Lv{mine.level}</span>
          <div>
            <p className="mono dim small">RANK #{rank} / {adventurers.length}</p>
            <h2>{mine.name}</h2>
            <p className="status-card__title">{mine.title} ・ {mine.teamName}</p>
            <div className="xpbar" role="img" aria-label={`次のレベルまで ${mine.next - mine.xp} XP`}>
              <span style={{ width: `${Math.round(mine.progress * 100)}%` }} />
            </div>
            <p className="mono small dim">{mine.xp} XP ・ 次のレベルまで {mine.next - mine.xp} XP</p>
          </div>
        </div>
        <div className="status-card__badges">
          <span className="panel__label mono">BADGES / 実績 {mine.badges.length}/{ALL_BADGES.length}</span>
          <ul className="badges">
            {ALL_BADGES.map((b) => (
              <li key={b.key} className={earned.has(b.key) ? "is-earned" : undefined} title={b.desc}>
                <span className="rune mono">{b.rune}</span>
                <b>{b.name}</b>
                <small>{b.desc}</small>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="ranking-layout">
        <section>
          <div className="section__head">
            <div>
              <p className="eyebrow eyebrow--sm">ADVENTURERS</p>
              <h2 className="section__title">冒険者</h2>
            </div>
          </div>
          <ol className="board">
            {adventurers.slice(0, 10).map((a, i) => (
              <li key={a.userId} className={a.userId === me.id ? "is-me" : undefined}>
                <span className={`board__rank mono${i < 3 ? " is-top" : ""}`}>{String(i + 1).padStart(2, "0")}</span>
                <span className="avatar avatar--sm" aria-hidden>{a.name.slice(0, 1)}</span>
                <span className="board__who">
                  <b>{a.name}</b>
                  <small className="dim">Lv{a.level} {a.title} ・ {a.teamCode}</small>
                </span>
                <span className="board__badges" aria-label={`実績 ${a.badges.length}`}>
                  {a.badges.slice(0, 4).map((b) => <i key={b.key} title={b.name}>{b.rune}</i>)}
                </span>
                <span className="board__xp mono">{a.xp}<small>XP</small></span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <div className="section__head">
            <div>
              <p className="eyebrow eyebrow--sm">GUILDS</p>
              <h2 className="section__title">ギルド（チーム）</h2>
            </div>
          </div>
          <ol className="guild-board">
            {guilds.map((g, i) => (
              <li key={g.teamId}>
                <span className="mono dim">{String(i + 1).padStart(2, "0")}</span>
                <Link href={`/teams/${g.teamId}`}>
                  <span className="mono code">{g.teamCode}</span> {g.teamName}
                </Link>
                <span className="guild-board__bar"><span style={{ width: `${(g.xp / maxGuild) * 100}%` }} /></span>
                <span className="mono">{g.xp}</span>
              </li>
            ))}
          </ol>

          <div className="panel rules">
            <span className="panel__label mono">HOW TO EARN XP / 経験値のもらい方</span>
            <table>
              <tbody>
                {XP_RULES.map((r) => (
                  <tr key={r.key}>
                    <td>{r.label}</td>
                    <td className="mono">{r.key === "bounty" ? "20＋共感×5" : `+${r.xp}`}</td>
                    <td className="mono dim">{mine.counts[r.key]}{r.key === "bounty" ? "XP" : "回"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
