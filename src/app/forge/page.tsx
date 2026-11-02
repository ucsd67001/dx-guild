import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/data";
import { listForgeSessions } from "@/lib/forge";
import { aiConnected, MODEL } from "@/lib/ai";
import { startForge } from "@/lib/actions";
import { fmtDate } from "@/lib/constants";
import { WorryForm } from "@/components/WorryForm";

export const metadata: Metadata = { title: "賢者の工房" };

export default async function Forge() {
  const me = await getCurrentUser();
  const mine = listForgeSessions(me.id);
  const others = listForgeSessions().filter((s) => s.userId !== me.id && s.plan).slice(0, 6);

  return (
    <div className="wrap page">
      <div className="forge-hero">
        <div>
          <p className="eyebrow">THE SAGE&apos;S FORGE</p>
          <h1 className="page__title">賢者の工房</h1>
          <p className="lead">
            まだ「なんかめんどう」の段階で大丈夫です。悩みや不満をひとこと書くと、賢者（AI）が質問しながら一緒に掘り下げ、
            <b>あるべき姿・問題・課題・解決策</b>に整理します。解決策には、実現の方法・ステップ・効果の試算がつきます。
          </p>
          <ol className="forge-flow mono">
            <li>WORRY<span>悩み</span></li>
            <li>DIALOGUE<span>壁打ち</span></li>
            <li>PLAN<span>企画書</span></li>
            <li>SHARE<span>共有</span></li>
          </ol>
        </div>
        <div className="frame forge-start">
          <span className="frame__label mono">NEW DIALOGUE</span>
          <WorryForm action={startForge} />
          <p className={`ai-status mono${aiConnected() ? " is-on" : ""}`}>
            <i aria-hidden />
            {aiConnected() ? `SAGE ONLINE · ${MODEL}` : "DEMO MODE · AI 未接続（.env.local に OPENAI_API_KEY）"}
          </p>
        </div>
      </div>

      <section className="section section--tight">
        <div className="section__head">
          <div>
            <p className="eyebrow eyebrow--sm">YOUR DIALOGUES</p>
            <h2 className="section__title">あなたの対話 <span className="mono dim">{mine.length}</span></h2>
          </div>
        </div>
        {mine.length ? <SessionList sessions={mine} /> : (
          <div className="empty empty--inline"><p>まだ対話はありません。上に悩みをひとこと書いて始めましょう。</p></div>
        )}
      </section>

      {others.length > 0 && (
        <section className="section section--tight">
          <div className="section__head">
            <div>
              <p className="eyebrow eyebrow--sm">FROM OTHER ADVENTURERS</p>
              <h2 className="section__title">ほかの冒険者の企画書</h2>
            </div>
          </div>
          <SessionList sessions={others} showWho />
        </section>
      )}
    </div>
  );
}

function SessionList({ sessions, showWho }: { sessions: ReturnType<typeof listForgeSessions>; showWho?: boolean }) {
  return (
    <ul className="sessions">
      {sessions.map((s) => {
        const status = s.solutionPostId ? "共有ずみ" : s.plan ? "企画書あり" : "対話中";
        return (
          <li key={s.id}>
            <Link href={`/forge/${s.id}`}>
              <span className={`status status--${s.solutionPostId ? "shared" : s.plan ? "planned" : "talking"}`}>{status}</span>
              <span className="sessions__title">{s.plan?.title ?? s.worry}</span>
              {showWho && <span className="dim small">{s.userName}（{s.teamCode}）</span>}
              <span className="mono dim small">{fmtDate(s.updatedAt)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
