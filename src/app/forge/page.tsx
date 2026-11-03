import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/data";
import { listForgeSessions } from "@/lib/forge";
import { aiConnected, MODEL } from "@/lib/ai";
import { startForge } from "@/lib/actions";
import { WorryForm } from "@/components/WorryForm";
import { StepTrack } from "@/components/StepTrack";
import { SessionList } from "@/components/SessionList";

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
            まだ「なんかめんどう」の段階で大丈夫です。悩みや不満をひとこと書くと、賢者（AI）が質問しながら、
            <b>問題・課題・解決策・実現方法</b>へと一段ずつ一緒に掘り下げます。最後は、効果の試算つきの企画書になります。
          </p>
          <StepTrack />
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
