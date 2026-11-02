import Link from "next/link";
import type { Plan } from "@/lib/ai";
import { toEffort } from "@/lib/ai";
import type { Post } from "@/lib/data";
import { HOURLY_COST, calcEffect, postCode, yen } from "@/lib/constants";

// 企画書：あるべき姿・現状・問題・課題 → 解決策の案（実現方法・ステップ・効果の試算・インパクトパス）
export function PlanView({ plan, cases, demo }: { plan: Plan; cases: Post[]; demo: boolean }) {
  const related = plan.related_case_ids
    .map((id) => cases.find((c) => c.id === id))
    .filter((c): c is Post => !!c);

  return (
    <div className="plan">
      <div className="plan__head">
        <p className="eyebrow">QUEST PLAN / 企画書</p>
        <h2 className="plan__title">{plan.title}</h2>
        {demo && <p className="demo-note">デモの企画書です（AI にはつながっていません）。形の確認用です。</p>}
      </div>

      {/* 現状 → あるべき姿 のあいだに、問題（ギャップ）と課題 */}
      <div className="gap">
        <div className="gap__cell gap__cell--asis">
          <span className="gap__label mono">AS-IS / 現状</span>
          <p>{plan.as_is}</p>
        </div>
        <div className="gap__cell gap__cell--problem">
          <span className="gap__label mono">PROBLEM / 問題</span>
          <p>{plan.problem}</p>
        </div>
        <div className="gap__cell gap__cell--tobe">
          <span className="gap__label mono">TO-BE / あるべき姿</span>
          <p>{plan.to_be}</p>
        </div>
      </div>
      <div className="issues">
        <span className="gap__label mono">ISSUES / 課題</span>
        <ol>
          {plan.issues.map((i, n) => (
            <li key={n}>{i}</li>
          ))}
        </ol>
      </div>

      <h3 className="plan__sub">
        解決策の案 <span className="mono dim">{plan.solutions.length}</span>
      </h3>
      <div className="options">
        {plan.solutions.map((s, i) => {
          const e = calcEffect(toEffort(s.estimate));
          const best = i === plan.recommended_index;
          return (
            <article key={i} className={`option${best ? " option--best" : ""}`}>
              <div className="option__head">
                <span className="mono dim">OPTION {String.fromCharCode(65 + i)}</span>
                {best && <span className="option__best">おすすめ</span>}
                <span className={`level level--${s.difficulty}`}>{s.difficulty}</span>
              </div>
              <h4>{s.name}</h4>
              <p className="option__summary">{s.summary}</p>
              <ul className="chips">
                {s.tools.map((t) => <li key={t} className="chip">{t}</li>)}
              </ul>

              <div className="option__block">
                <span className="gap__label mono">HOW / 実現方法</span>
                <p>{s.approach}</p>
              </div>

              <div className="option__block">
                <span className="gap__label mono">STEPS / ステップ</span>
                <ol className="steps-list">
                  {s.steps.map((st, n) => (
                    <li key={n}>
                      <b>{st.title}</b>
                      <span className="mono dim">{st.duration}</span>
                      <p>{st.detail}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="option__block effect">
                <span className="gap__label mono">IMPACT ESTIMATE / 効果の試算</span>
                <div className="effect__figures">
                  <div>
                    <span className="effect__value mono">−{e.savedHours}<small>h／月</small></span>
                    <span className="small dim">減る時間（いま {e.currentHours}h／月）</span>
                  </div>
                  <div>
                    <span className="effect__value effect__value--yen mono">{yen(e.savedYenPerYear)}</span>
                    <span className="small dim">年あたり（時間単価 {yen(HOURLY_COST)}）</span>
                  </div>
                </div>
                <p className="effect__formula mono">
                  {s.estimate.times_per_month}回/月 × {s.estimate.minutes_per_time}分 × {s.estimate.people}人 × 削減率{" "}
                  {Math.round(s.estimate.reduction_rate * 100)}%
                </p>
                <p className="small dim">前提：{s.estimate.assumptions}</p>
              </div>

              <div className="option__block">
                <span className="gap__label mono">IMPACT PATH / 効果 → 成果 → インパクト</span>
                <ol className="path">
                  <li><span className="mono">OUTPUT</span>{s.impact_path.output}</li>
                  <li><span className="mono">OUTCOME</span>{s.impact_path.outcome}</li>
                  <li><span className="mono">IMPACT</span>{s.impact_path.impact}</li>
                </ol>
              </div>

              <div className="option__block">
                <span className="gap__label mono">RISKS / 気をつけること</span>
                <ul className="risks">
                  {s.risks.map((r, n) => <li key={n}>{r}</li>)}
                </ul>
              </div>
            </article>
          );
        })}
      </div>

      <div className="plan__foot">
        <div className="callout">
          <span className="gap__label mono">WHY / おすすめの理由</span>
          <p>{plan.recommended_reason}</p>
        </div>
        <div className="callout callout--go">
          <span className="gap__label mono">FIRST STEP / 明日からの一歩</span>
          <p>{plan.first_step}</p>
        </div>
      </div>

      {related.length > 0 && (
        <div className="plan__cases">
          <span className="gap__label mono">REFERENCES / 参考にした社内事例</span>
          <ul>
            {related.map((c) => (
              <li key={c.id}>
                <Link href={`/posts/${c.id}`}>
                  <b className="mono">{postCode(c.kind, c.id)}</b> {c.title}
                </Link>
                <span className="dim small">（{c.teamName}）</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
