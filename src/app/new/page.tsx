import type { Metadata } from "next";
import { getCurrentUser, getPost, listPosts } from "@/lib/data";
import { createPost } from "@/lib/actions";
import { CATEGORIES, HOURLY_COST, STAGES, TOOLS, postCode } from "@/lib/constants";
import { EffectCalculator } from "@/components/EffectCalculator";

export const metadata: Metadata = { title: "投稿する" };

type Search = Record<string, string | string[] | undefined>;

// 困りごとと解決策は一つのフォーム。種類を切り替えると、出る欄が替わる（CSS の :has で切り替え）
export default async function NewPost({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const kind = sp.kind === "solution" ? "solution" : "problem";
  const linked = typeof sp.problem === "string" ? getPost(Number(sp.problem)) : undefined;
  const problems = listPosts({ kind: "problem" });
  const me = await getCurrentUser();

  return (
    <div className="wrap page page--narrow">
      <p className="eyebrow">NEW POST</p>
      <h1 className="page__title">投稿する</h1>
      <p className="lead">
        {me.name}（{me.teamName}）として投稿します。うまく書こうとしなくて大丈夫です。
      </p>

      <form action={createPost} className="form">
        <fieldset className="kind-switch">
          <legend className="field__label mono">TYPE</legend>
          <label className="kind-option kind-option--problem">
            <input type="radio" name="kind" value="problem" defaultChecked={kind === "problem"} />
            <span>
              <b>困りごと</b>
              <small>手作業や、時間を取られていること</small>
            </span>
          </label>
          <label className="kind-option kind-option--solution">
            <input type="radio" name="kind" value="solution" defaultChecked={kind === "solution"} />
            <span>
              <b>解決策</b>
              <small>ツールや AI でこう解いた、という工夫</small>
            </span>
          </label>
        </fieldset>

        <label className="field">
          <span className="field__label">
            題 <em>必須</em>
          </span>
          <input name="title" required maxLength={100} placeholder="例：退職者アカウントの棚卸しを、Excel で突き合わせている" />
        </label>

        <label className="field">
          <span className="field__label">
            ひとことで <em>必須</em>
          </span>
          <textarea name="summary" required maxLength={240} rows={2} placeholder="一覧に出る説明です。2行くらいで。" />
        </label>

        <label className="field">
          <span className="field__label">
            <span className="only-problem">いまのやり方と、困っていること</span>
            <span className="only-solution">やったこと・結果・横展開するときのポイント</span>
          </span>
          <textarea
            name="body"
            rows={9}
            maxLength={8000}
            placeholder={"■ やったこと\n\n■ 結果\n\n■ 横展開するときのポイント"}
          />
        </label>

        <label className="field">
          <span className="field__label">分類</span>
          <select name="category" defaultValue={linked?.category ?? CATEGORIES[0]}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>

        <EffectCalculator hourlyCost={HOURLY_COST} />

        <fieldset className="field">
          <legend className="field__label">
            <span className="only-problem">いま使っているツール（あれば）</span>
            <span className="only-solution">使ったツール</span>
          </legend>
          <div className="checks">
            {TOOLS.map((t) => (
              <label key={t} className="check">
                <input type="checkbox" name="tools" value={t} />
                <span>{t}</span>
              </label>
            ))}
          </div>
          <input name="toolsOther" maxLength={200} placeholder="ほかのツール（読点で区切る）" />
        </fieldset>

        <label className="field">
          <span className="field__label">タグ（読点・スペースで区切る）</span>
          <input name="tags" maxLength={200} defaultValue={linked?.tags.join("、")} placeholder="例：棚卸し、退職者、監査" />
        </label>

        <div className="form__row only-solution">
          <label className="field">
            <span className="field__label">段階</span>
            <select name="stage" defaultValue="live">
              {Object.entries(STAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field__label">答えている困りごと（あれば）</span>
            <select name="problemId" defaultValue={linked?.id ?? ""}>
              <option value="">― 選ばない</option>
              {problems.map((p) => (
                <option key={p.id} value={p.id}>
                  {postCode(p.kind, p.id)}　{p.title.length > 34 ? `${p.title.slice(0, 34)}…` : p.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form__actions">
          <button className="btn btn--primary">
            投稿する <span aria-hidden>→</span>
          </button>
        </div>
      </form>
    </div>
  );
}
