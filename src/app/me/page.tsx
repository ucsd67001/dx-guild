import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser, listPosts, type Post } from "@/lib/data";
import { listForgeSessions } from "@/lib/forge";
import { ALL_BADGES, XP_RULES, listAdventurers } from "@/lib/game";
import { PostCard } from "@/components/PostCard";
import { SessionList } from "@/components/SessionList";

export const metadata: Metadata = { title: "マイページ" };

// 自分のこと：レベル・実績、自分の挑戦と成功事例、困りごと、賢者との対話
export default async function MyPage() {
  const me = await getCurrentUser();
  const adventurers = listAdventurers();
  const mine = adventurers.find((a) => a.userId === me.id)!;
  const rank = adventurers.indexOf(mine) + 1;
  const earned = new Set(mine.badges.map((b) => b.key));
  const posts = listPosts({ author: me.id });
  // 挑戦中を先に：結果の報告を待っているもの
  const solutions = posts
    .filter((p) => p.kind === "solution")
    .sort((a, b) => Number(b.stage === "challenge") - Number(a.stage === "challenge"));
  const problems = posts.filter((p) => p.kind === "problem");
  const dialogues = listForgeSessions(me.id);

  return (
    <div className="wrap page">
      <p className="eyebrow">MY PAGE</p>
      <h1 className="page__title">マイページ</h1>

      <section className="status-card">
        <div className="status-card__main">
          <span className="crest mono" aria-hidden>Lv{mine.level}</span>
          <div>
            <p className="mono dim small">
              RANK #{rank} / {adventurers.length} ・ <Link href="/community" className="more">コミュニティで見る →</Link>
            </p>
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

      <div className="me-layout">
        <div>
          <Posts en="MY CHALLENGES & SUCCESSES" title="あなたの挑戦と成功事例" posts={solutions} empty="まだ挑戦の投稿はありません。賢者と壁打ちして企画書を作ると、ワンクリックで挑戦として共有できます。" />
          <Posts en="MY PROBLEMS" title="あなたの困りごと" posts={problems} empty="まだ困りごとの投稿はありません。" />
          <section className="section section--tight">
            <div className="section__head">
              <div>
                <p className="eyebrow eyebrow--sm">MY DIALOGUES</p>
                <h2 className="section__title">賢者との対話 <span className="mono dim">{dialogues.length}</span></h2>
              </div>
              <Link href="/forge" className="more mono">NEW →</Link>
            </div>
            {dialogues.length ? <SessionList sessions={dialogues} /> : (
              <div className="empty empty--inline"><p>まだ対話はありません。</p></div>
            )}
          </section>
        </div>

        <aside className="section section--tight">
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
        </aside>
      </div>
    </div>
  );
}

function Posts({ en, title, posts, empty }: { en: string; title: string; posts: Post[]; empty: string }) {
  return (
    <section className="section section--tight">
      <div className="section__head">
        <div>
          <p className="eyebrow eyebrow--sm">{en}</p>
          <h2 className="section__title">
            {title} <span className="mono dim">{posts.length}</span>
          </h2>
        </div>
      </div>
      {posts.length ? (
        <div className="grid grid--2">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
      ) : (
        <div className="empty empty--inline"><p>{empty}</p></div>
      )}
    </section>
  );
}
