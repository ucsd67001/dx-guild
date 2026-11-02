import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCurrentUser,
  getPost,
  hasReacted,
  listAdoptions,
  listComments,
  listReactingTeams,
  listRelated,
  listSolutionsFor,
} from "@/lib/data";
import { addComment, adoptSolution, reportResult, toggleReaction, withdrawAdoption } from "@/lib/actions";
import { HOURLY_COST, REACTION_OF, STAGES, fmtDate, man, postCode } from "@/lib/constants";
import { bountyOf } from "@/lib/game";
import { KindBadge, PostCard } from "@/components/PostCard";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost(Number((await params).id));
  return { title: post?.title ?? "見つかりません" };
}

export default async function PostPage({ params }: Props) {
  const post = getPost(Number((await params).id));
  if (!post) notFound();

  const me = await getCurrentUser();
  const isProblem = post.kind === "problem";
  const stage = post.stage ?? "challenge";
  const isChallenge = !isProblem && stage === "challenge";
  const isSuccess = !isProblem && stage === "success";
  const isLesson = !isProblem && stage === "lesson";
  const isMine = post.authorId === me.id;
  // 困りごと＝うちも困っている／挑戦中＝一緒にやりたい／成功事例＝うちでも使いたい／学び＝参考になった
  const reactionType = isProblem ? "metoo" : REACTION_OF[stage];
  const reaction = isProblem
    ? { label: "うちも困っている", count: post.metoo, list: "ALSO STRUGGLING" }
    : isChallenge
      ? { label: "一緒にやりたい", count: post.join, list: "WANTS TO JOIN" }
      : isLesson
        ? { label: "参考になった", count: post.want, list: "FOUND IT HELPFUL" }
        : { label: "うちでも使いたい", count: post.want, list: "WANTS TO USE" };
  const reacted = hasReacted(post.id, me.id, reactionType);
  const reactingTeams = listReactingTeams(post.id, reactionType);
  const comments = listComments(post.id);
  const related = listRelated(post);
  const solutions = isProblem ? listSolutionsFor(post.id) : [];
  const adoptions = isSuccess ? listAdoptions(post.id) : [];
  const problem = post.problemId ? getPost(post.problemId) : undefined;
  const myTeamAdopted = adoptions.some((a) => a.teamId === me.teamId);
  const ownTeam = post.teamId === me.teamId;

  return (
    <div className="wrap page">
      <nav className="crumbs mono">
        <Link href="/explore">EXPLORE</Link>
        <span>/</span>
        <Link href={isProblem ? "/explore?kind=problem" : `/explore?stage=${stage}`}>
          {isProblem ? "PROBLEMS" : isChallenge ? "CHALLENGES" : isLesson ? "LESSONS" : "SUCCESSES"}
        </Link>
        <span>/</span>
        <span>{postCode(post.kind, post.id)}</span>
      </nav>

      <div className="detail">
        <article className="detail__main">
          <div className="detail__meta">
            <KindBadge post={post} />
            <span className="chip">{post.category}</span>
            <span className="mono dim">{fmtDate(post.createdAt)}</span>
          </div>
          <h1 className="detail__title">{post.title}</h1>
          <p className="detail__summary">{post.summary}</p>

          {problem && (
            <Link href={`/posts/${problem.id}`} className="answers">
              <span className="mono">ANSWERS →</span>
              <span>
                <b>{postCode(problem.kind, problem.id)}</b>（{problem.teamName}）{problem.title}
              </span>
            </Link>
          )}

          <div className="detail__byline">
            <span className="avatar" aria-hidden>{post.authorName.slice(0, 1)}</span>
            <div>
              <b>{post.authorName}</b>
              <Link href={`/teams/${post.teamId}`} className="dim"> ／ {post.teamName}（{post.teamCode}）</Link>
              <p className="dim small">
                {isProblem
                  ? "同じことで困っていたら、下のボタンで知らせてください。"
                  : isChallenge
                    ? "いま挑戦している最中です。一緒にやりたい人は、ボタンで知らせてください。"
                    : isLesson
                      ? "うまくいかなかった挑戦の記録です。次に試す人のための学びが書いてあります。"
                      : "詳しく知りたいことは、コメントで作った人に聞けます。"}
              </p>
            </div>
          </div>

          {post.body && <div className="prose">{post.body}</div>}

          {(post.tools.length > 0 || post.tags.length > 0) && (
            <ul className="chips chips--lg">
              {post.tools.map((t) => <li key={t} className="chip">{t}</li>)}
              {post.tags.map((t) => <li key={t} className="chip chip--tag">#{t}</li>)}
            </ul>
          )}

          {isProblem && (
            <section className="block">
              <div className="block__head">
                <h2>この困りごとへの挑戦と事例 <span className="mono dim">{solutions.length}</span></h2>
                <Link href={`/new?kind=solution&problem=${post.id}`} className="btn btn--ghost btn--sm">
                  ＋ 挑戦を始める
                </Link>
              </div>
              {solutions.length ? (
                <div className="grid grid--2">
                  {solutions.map((s) => <PostCard key={s.id} post={s} />)}
                </div>
              ) : (
                <div className="empty empty--inline">
                  <p>まだ挑戦はありません。下の「似ている投稿」に、よそのチームのヒントがあるかもしれません。</p>
                </div>
              )}
            </section>
          )}

          <section className="block">
            <div className="block__head">
              <h2>コメント <span className="mono dim">{comments.length}</span></h2>
            </div>
            <ol className="comments">
              {comments.map((c) => (
                <li key={c.id}>
                  <span className="avatar avatar--sm" aria-hidden>{c.userName.slice(0, 1)}</span>
                  <div>
                    <p className="comments__who">
                      <b>{c.userName}</b> <span className="mono dim">{c.teamCode} · {fmtDate(c.createdAt)}</span>
                    </p>
                    <p className="comments__body">{c.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <form action={addComment} className="comment-form">
              <input type="hidden" name="postId" value={post.id} />
              <textarea name="body" required maxLength={2000} rows={3} placeholder={`${me.name} としてコメントする`} />
              <button className="btn btn--primary btn--sm">送る</button>
            </form>
          </section>
        </article>

        <aside className="detail__side">
          <div className="panel">
            <span className="panel__label mono">{isProblem ? "IMPACT" : isChallenge ? "CHALLENGE" : isLesson ? "LESSON" : "RESULT"}</span>
            <div className="panel__figures">
              {post.hours != null && !isLesson && (
                <Figure
                  value={isProblem ? `${post.hours}` : `−${post.hours}`}
                  unit="h／月"
                  label={isProblem ? "手作業にかかる時間" : isChallenge ? "減る見込みの時間" : "減った時間"}
                />
              )}
              {isProblem && <Figure value={post.metoo} unit="人" label="同じく困っている" />}
              {isChallenge && <Figure value={post.join} unit="人" label="一緒にやりたい" accent />}
              {isSuccess && <Figure value={adoptions.length} unit="チーム" label="横展開した" accent />}
              {!isProblem && <Figure value={STAGES[stage]} label="段階" />}
              {isSuccess && post.hours != null && (
                <Figure value={man(post.hours * 12 * HOURLY_COST * (1 + adoptions.length))} unit="万円" label="年あたり（使っている全チーム）" accent />
              )}
              {isProblem && post.solutions === 0 && <Figure value={`+${bountyOf(post.metoo)}`} unit="XP" label="解決した人への報酬" accent />}
            </div>
            {isProblem && post.solutions === 0 && (
              <Link href={`/forge`} className="small forge-link">✦ 自分で解決策を考えてみる（賢者の工房）</Link>
            )}

            {/* 自分の挑戦に「一緒にやりたい」は押せない */}
            {!(isChallenge && isMine) && (
              <form action={toggleReaction}>
                <input type="hidden" name="postId" value={post.id} />
                <button className={`btn btn--block ${reacted ? "btn--on" : "btn--ghost"}`}>
                  {reacted ? `✓ ${reaction.label}` : reaction.label}
                  <span className="mono">{reaction.count}</span>
                </button>
              </form>
            )}

            {isChallenge && isMine && (
              <div className="report">
                <span className="panel__label mono">REPORT</span>
                <p className="small dim">挑戦の結果を報告すると、成功事例か学びになります。</p>
                <details className="report__item">
                  <summary>うまくいった → 成功事例にする</summary>
                  <form action={reportResult} className="adopt-form">
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="outcome" value="success" />
                    <label className="field">
                      <span className="field__label">実際に減った時間（h／月）</span>
                      <input name="hours" type="number" min="0.1" step="0.1" max="9999" defaultValue={post.hours ?? undefined} />
                    </label>
                    <textarea name="note" maxLength={2000} rows={3} placeholder="やってみてどうだったか（任意）" />
                    <button className="btn btn--primary btn--block">成功事例にする</button>
                  </form>
                </details>
                <details className="report__item">
                  <summary>うまくいかなかった → 学びとして残す</summary>
                  <form action={reportResult} className="adopt-form">
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="outcome" value="lesson" />
                    <textarea
                      name="note"
                      required
                      maxLength={2000}
                      rows={4}
                      placeholder="何がうまくいかなかったか、次に試す人へのひとこと（必須）"
                    />
                    <button className="btn btn--ghost btn--block">学びとして残す</button>
                  </form>
                </details>
              </div>
            )}

            {isSuccess && !ownTeam && (
              myTeamAdopted ? (
                <form action={withdrawAdoption}>
                  <input type="hidden" name="postId" value={post.id} />
                  <p className="adopted mono">✓ {me.teamCode} で横展開ずみ</p>
                  <button className="link-btn small">取り消す</button>
                </form>
              ) : (
                <form action={adoptSolution} className="adopt-form">
                  <input type="hidden" name="postId" value={post.id} />
                  <input name="note" maxLength={200} placeholder="ひとこと（例：項目を足して使っています）" />
                  <button className="btn btn--primary btn--block">{me.teamName}に横展開した</button>
                </form>
              )
            )}
            {isSuccess && ownTeam && <p className="small dim">あなたのチームの成功事例です。ほかのチームが取り入れると、ここに数が増えます。</p>}
            {isChallenge && !isMine && <p className="small dim">挑戦が成功すると成功事例になり、横展開できるようになります。</p>}

            {reactingTeams.length > 0 && (
              <div className="panel__list">
                <span className="panel__label mono">{reaction.list}</span>
                <ul>
                  {reactingTeams.map((t) => (
                    <li key={t.teamId}>
                      <Link href={`/teams/${t.teamId}`}>{t.teamName}</Link>
                      <span className="mono dim">{t.people}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {adoptions.length > 0 && (
              <div className="panel__list">
                <span className="panel__label mono">ADOPTED BY</span>
                <ul className="adoptions">
                  {adoptions.map((a) => (
                    <li key={a.id}>
                      <div>
                        <Link href={`/teams/${a.teamId}`}>{a.teamName}</Link>
                        {a.note && <p className="small dim">{a.note}</p>}
                      </div>
                      <span className="mono dim">{fmtDate(a.createdAt).slice(5)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="section section--tight">
          <div className="section__head">
            <div>
              <p className="eyebrow eyebrow--sm">RELATED</p>
              <h2 className="section__title">似ている投稿 ― よそのチームのヒント</h2>
            </div>
          </div>
          <div className="grid grid--4">
            {related.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Figure({ value, unit, label, accent }: { value: number | string; unit?: string; label: string; accent?: boolean }) {
  return (
    <div className={`figure${accent ? " figure--accent" : ""}`}>
      <span className="figure__value mono">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      <span className="figure__label">{label}</span>
    </div>
  );
}
