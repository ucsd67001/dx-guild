import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser, getStats } from "@/lib/data";
import { listAdventurers, listGuilds } from "@/lib/game";

export const metadata: Metadata = { title: "コミュニティ" };

// IT Div. 全体のいま：数字と、冒険者・チームのランキング
export default async function Community() {
  const me = await getCurrentUser();
  const stats = getStats();
  const adventurers = listAdventurers();
  const teams = listGuilds();
  const maxTeam = Math.max(...teams.map((g) => g.xp), 1);
  const myRank = adventurers.findIndex((a) => a.userId === me.id) + 1;

  return (
    <div className="wrap page">
      <p className="eyebrow">IT DIV. COMMUNITY</p>
      <h1 className="page__title">コミュニティ</h1>
      <p className="lead">
        IT Div. 全体で、いまどれだけの悩みと挑戦が動き、どれだけ成功しているか。困りごとを出す・挑戦する・成功を広げる、その行いが経験値（XP）になります。
      </p>

      <section className="stats">
        <Stat label="PROBLEMS" title="困りごと" value={stats.problems} note={`うち挑戦者待ち ${stats.openProblems}件`} />
        <Stat label="CHALLENGES" title="いま挑戦中" value={stats.challenges} note={`学びとして残った ${stats.lessons}件`} />
        <Stat label="SUCCESSES" title="成功事例" value={stats.successes} note={`ほかのチームが取り入れた ${stats.adoptions}件`} accent />
        <Stat label="HOURS SAVED / MONTH" title="減った時間（月）" value={Math.round(stats.hoursSaved)} unit="h" note="成功事例の申告 × 使っているチーム数" />
      </section>

      <div className="ranking-layout">
        <section>
          <div className="section__head">
            <div>
              <p className="eyebrow eyebrow--sm">ADVENTURERS</p>
              <h2 className="section__title">冒険者ランキング</h2>
            </div>
            <Link href="/me" className="more mono">YOU #{myRank} →</Link>
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
              <p className="eyebrow eyebrow--sm">TEAMS</p>
              <h2 className="section__title">チームランキング</h2>
            </div>
          </div>
          <ol className="guild-board">
            {teams.map((g, i) => (
              <li key={g.teamId} className={g.teamId === me.teamId ? "is-me" : undefined}>
                <span className="mono dim">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="mono code">{g.teamCode}</span> {g.teamName}
                </span>
                <span className="guild-board__bar"><span style={{ width: `${(g.xp / maxTeam) * 100}%` }} /></span>
                <span className="mono">{g.xp}</span>
              </li>
            ))}
          </ol>
          <p className="small dim">チームの XP は、メンバーの XP の合計です。</p>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, title, value, unit, note, accent }: {
  label: string; title: string; value: number; unit?: string; note: string; accent?: boolean;
}) {
  return (
    <div className={`stat${accent ? " stat--accent" : ""}`}>
      <span className="stat__label mono">{label}</span>
      <span className="stat__value mono">
        {value.toLocaleString()}
        {unit && <small>{unit}</small>}
      </span>
      <span className="stat__title">{title}</span>
      <span className="stat__note dim">{note}</span>
    </div>
  );
}
