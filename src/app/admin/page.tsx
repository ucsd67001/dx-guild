import Link from "next/link";
import type { Metadata } from "next";
import { adminKpis, byCategory, forgeFunnel, priorityQuests, problemFunnel, toolUsage, weeklyPosts } from "@/lib/admin";
import { listForgeSessions } from "@/lib/forge";
import { HOURLY_COST, fmtDate, man, postCode, yen } from "@/lib/constants";
import { FunnelBars, HBars, WeeklyChart } from "@/components/Charts";

export const metadata: Metadata = { title: "物見の塔" };

// 物見の塔：管理者ダッシュボード（2026-11-03 に「司令室」から名前を替えた）。
// ⚠️ いまはだれでも開ける（ログインが入ったら、管理者だけにする）
export default function Admin() {
  const k = adminKpis();
  const categories = byCategory();
  const maxOpen = Math.max(1, ...categories.map((c) => c.hours));
  const sessions = listForgeSessions().slice(0, 5);

  return (
    <div className="wrap page">
      <p className="eyebrow">THE WATCHTOWER</p>
      <h1 className="page__title">物見の塔</h1>
      <p className="lead">IT Div. の悩みと挑戦が、どれだけ生まれ、どれだけ成功して横に広がり、どれだけの時間を生んでいるか。</p>

      <section className="stats stats--admin">
        <Kpi label="PROBLEMS" title="困りごと" value={`${k.problems}`} note={`解決率 ${Math.round(k.solvedRate * 100)}%`} />
        <Kpi label="SUCCESSES" title="成功事例" value={`${k.successes}`} note={`挑戦中 ${k.challenges}件・学び ${k.lessons}件・横展開 ${k.adoptions}件`} />
        <Kpi label="HOURS SAVED / MONTH" title="減った時間（月）" value={`${Math.round(k.savedHours)}`} unit="h" note="成功事例の申告 × 使っているチーム数" accent />
        <Kpi label="VALUE / YEAR" title="金額換算（年）" value={man(k.savedYenPerYear)} unit="万円" note={`時間単価 ${yen(HOURLY_COST)}`} accent />
        <Kpi label="OPEN HOURS / MONTH" title="まだ手作業の時間（月）" value={`${Math.round(k.openHours)}`} unit="h" note="挑戦がまだ無い困りごと" />
        <Kpi label="ACTIVE / 30 DAYS" title="動いた冒険者" value={`${k.active}`} unit={`/${k.users}`} note="投稿・反応・対話した人" />
      </section>

      <div className="admin-grid">
        <section className="panel">
          <span className="panel__label mono">WEEKLY POSTS / 週ごとの投稿</span>
          <WeeklyChart data={weeklyPosts()} />
        </section>

        <section className="panel">
          <span className="panel__label mono">FROM WORRY TO IMPACT / 悩みが成果になるまで</span>
          <FunnelBars data={forgeFunnel()} />
          <span className="panel__label mono">PROBLEM FLOW / 困りごとの行き先</span>
          <FunnelBars data={problemFunnel()} />
        </section>

        <section className="panel admin-grid__wide">
          <span className="panel__label mono">PRIORITY QUESTS / 優先して手を打つべきクエスト</span>
          <p className="small dim">挑戦も解決策もまだ無く、手作業の時間 ×（1＋同じく困っている人の数）が大きい順</p>
          <table className="table table--plain">
            <thead>
              <tr><th>クエスト</th><th>チーム</th><th className="num">手作業 h/月</th><th className="num">共感</th><th className="num">優先度</th></tr>
            </thead>
            <tbody>
              {priorityQuests().map(({ post, score }) => (
                <tr key={post.id}>
                  <td><Link href={`/posts/${post.id}`} className="table__link"><span className="mono dim">{postCode(post.kind, post.id)}</span> {post.title}</Link></td>
                  <td className="mono">{post.teamCode}</td>
                  <td className="num mono">{post.hours ?? "-"}</td>
                  <td className="num mono">{post.metoo}</td>
                  <td className="num mono"><b>{Math.round(score)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <span className="panel__label mono">BY CATEGORY / 分類ごと</span>
          {/* 列が多いので、狭い画面では表だけを横に送る */}
          <div className="table-scroll">
          <table className="table table--plain">
            <thead>
              <tr><th>分類</th><th className="num">困りごと</th><th className="num">挑戦待ち</th><th className="num">挑戦中</th><th className="num">成功</th><th>挑戦待ちの手作業 h/月</th></tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td className="num mono">{c.problems}</td>
                  <td className="num mono">{c.open}</td>
                  <td className="num mono">{c.challenges}</td>
                  <td className="num mono">{c.successes}</td>
                  <td>
                    <span className="bar bar--wide">
                      <span className="bar__fill bar__fill--warm" style={{ width: `${(c.hours / maxOpen) * 100}%` }} />
                      <span className="bar__value mono">{c.hours}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>

        <section className="panel">
          <span className="panel__label mono">TOOLS / 挑戦と成功事例で使われているツール</span>
          <HBars data={toolUsage().map((t) => ({ label: t.tool, value: t.solutions, note: `横展開 ${t.adoptions}` }))} />
        </section>

        <section className="panel admin-grid__wide">
          <span className="panel__label mono">RECENT DIALOGUES / 最近の賢者との対話</span>
          <ul className="sessions">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link href={`/forge/${s.id}`}>
                  <span className={`status status--${s.solutionPostId ? "shared" : s.plan ? "planned" : "talking"}`}>
                    {s.solutionPostId ? "共有ずみ" : s.plan ? "企画書あり" : "対話中"}
                  </span>
                  <span className="sessions__title">{s.plan?.title ?? s.worry}</span>
                  <span className="dim small">{s.userName}（{s.teamCode}）</span>
                  <span className="mono dim small">{fmtDate(s.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, title, value, unit, note, accent }: { label: string; title: string; value: string; unit?: string; note: string; accent?: boolean }) {
  return (
    <div className={`stat${accent ? " stat--accent" : ""}`}>
      <span className="stat__label mono">{label}</span>
      <span className="stat__value mono">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      <span className="stat__title">{title}</span>
      <span className="stat__note dim">{note}</span>
    </div>
  );
}
