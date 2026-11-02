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
import { addComment, adoptSolution, toggleReaction, withdrawAdoption } from "@/lib/actions";
import { HOURLY_COST, STAGES, fmtDate, man, postCode } from "@/lib/constants";
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
  const reactionType = isProblem ? "metoo" : "want";
  const reacted = hasReacted(post.id, me.id, reactionType);
  const reactingTeams = listReactingTeams(post.id, reactionType);
  const comments = listComments(post.id);
  const related = listRelated(post);
  const solutions = isProblem ? listSolutionsFor(post.id) : [];
  const adoptions = isProblem ? [] : listAdoptions(post.id);
  const problem = post.problemId ? getPost(post.problemId) : undefined;
  const myTeamAdopted = adoptions.some((a) => a.teamId === me.teamId);
  const ownTeam = post.teamId === me.teamId;

  return (
    <div className="wrap page">
      <nav className="crumbs mono">
        <Link href="/explore">EXPLORE</Link>
        <span>/</span>
        <Link href={`/explore?kind=${post.kind}`}>{isProblem ? "PROBLEMS" : "SOLUTIONS"}</Link>
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
                {isProblem ? "同じことで困っていたら、下のボタンで知らせてください。" : "詳しく知りたいことは、コメントで作った人に聞けます。"}
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
                <h2>この困りごとへの解決策 <span className="mono dim">{solutions.length}</span></h2>
                <Link href={`/new?kind=solution&problem=${post.id}`} className="btn btn--ghost btn--sm">
                  ＋ 解決策を投稿する
                </Link>
              </div>
              {solutions.length ? (
                <div className="grid grid--2">
                  {solutions.map((s) => <PostCard key={s.id} post={s} />)}
                </div>
              ) : (
                <div className="empty empty--inline">
                  <p>まだ解決策はありません。下の「似ている投稿」に、よそのチームのヒントがあるかもしれません。</p>
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
            <span className="panel__label mono">{isProblem ? "IMPACT" : "RESULT"}</span>
            <div className="panel__figures">
              {post.hours != null && (
                <Figure value={isProblem ? `${post.hours}` : `−${post.hours}`} unit="h／月" label={isProblem ? "手作業にかかる時間" : "減った時間"} />
              )}
              {isProblem ? (
                <Figure value={post.metoo} unit="人" label="同じく困っている" />
              ) : (
                <Figure value={adoptions.length} unit="チーム" label="横展開した" accent />
              )}
              {!isProblem && post.stage && <Figure value={STAGES[post.stage]} label="段階" />}
              {!isProblem && post.hours != null && (
                <Figure value={man(post.hours * 12 * HOURLY_COST * (1 + adoptions.length))} unit="万円" label="年あたり（使っている全チーム）" accent />
              )}
              {isProblem && post.solutions === 0 && <Figure value={`+${bountyOf(post.metoo)}`} unit="XP" label="解決した人への報酬" accent />}
            </div>
            {isProblem && post.solutions === 0 && (
              <Link href={`/forge`} className="small forge-link">✦ 自分で解決策を考えてみる（賢者の工房）</Link>
            )}

            <form action={toggleReaction}>
              <input type="hidden" name="postId" value={post.id} />
              <button className={`btn btn--block ${reacted ? "btn--on" : "btn--ghost"}`}>
                {isProblem
                  ? reacted ? "✓ うちも困っている" : "うちも困っている"
                  : reacted ? "✓ うちでも使いたい" : "うちでも使いたい"}
                <span className="mono">{isProblem ? post.metoo : post.want}</span>
              </button>
            </form>

            {!isProblem && !ownTeam && (
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
            {!isProblem && ownTeam && <p className="small dim">あなたのチームの解決策です。ほかのチームが取り入れると、ここに数が増えます。</p>}

            {reactingTeams.length > 0 && (
              <div className="panel__list">
                <span className="panel__label mono">{isProblem ? "ALSO STRUGGLING" : "WANTS TO USE"}</span>
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
