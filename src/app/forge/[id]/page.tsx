import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, getPost, type Post } from "@/lib/data";
import { getForgeSession, searchCases } from "@/lib/forge";
import { shareForge } from "@/lib/actions";
import { postCode, KIND_LABEL } from "@/lib/constants";
import { ForgeChat } from "@/components/ForgeChat";
import { PlanView } from "@/components/PlanView";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = getForgeSession(Number((await params).id));
  return { title: s ? `賢者の工房：${s.plan?.title ?? s.worry.slice(0, 20)}` : "見つかりません" };
}

export default async function ForgeSessionPage({ params }: Props) {
  const s = getForgeSession(Number((await params).id));
  if (!s) notFound();
  const me = await getCurrentUser();
  const isMine = s.userId === me.id;
  const cases = searchCases(`${s.worry}\n${s.messages.map((m) => m.content).join("\n")}`);
  const planCases = (s.plan?.related_case_ids ?? []).map((id) => getPost(id)).filter((p): p is Post => !!p);

  return (
    <div className="wrap page">
      <nav className="crumbs mono">
        <Link href="/forge">FORGE</Link>
        <span>/</span>
        <span>DIALOGUE-{String(s.id).padStart(4, "0")}</span>
      </nav>

      <div className="forge-room">
        <div>
          <p className="eyebrow">DIALOGUE WITH THE SAGE</p>
          <h1 className="detail__title">{s.worry}</h1>
          <p className="dim small">
            {s.userName}（{s.teamCode}）の対話{s.demo && " ・ デモの応答を含みます"}
          </p>
          <ForgeChat
            sessionId={s.id}
            worry={s.worry}
            userName={s.userName}
            initialMessages={s.messages}
            canTalk={isMine && !s.solutionPostId}
            hasPlan={!!s.plan}
          />
        </div>

        <aside className="detail__side">
          <div className="panel">
            <span className="panel__label mono">CASE LIBRARY / 社内の似た事例</span>
            {cases.length ? (
              <ul className="case-list">
                {cases.map((c) => (
                  <li key={c.id}>
                    <Link href={`/posts/${c.id}`}>
                      <span className={`kind-dot kind-dot--${c.kind}`} />
                      <span className="mono dim">{postCode(c.kind, c.id)} · {KIND_LABEL[c.kind]}</span>
                      <b>{c.title}</b>
                    </Link>
                    <span className="small dim">
                      {c.teamName}
                      {c.kind === "solution" && ` ・ 横展開 ${c.adoptions}チーム`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small dim">まだ似た事例は見つかっていません。対話が進むと、ここに出てきます。</p>
            )}
            <p className="small dim">賢者は、この一覧にある事例だけを紹介します。</p>
          </div>
        </aside>
      </div>

      {s.plan && (
        <section id="plan" className="section section--tight">
          <PlanView plan={s.plan} cases={planCases} demo={s.demo} />
          <div className="share">
            {s.solutionPostId ? (
              <p>
                ✓ 挑戦として共有しました：
                {s.problemPostId && <Link href={`/posts/${s.problemPostId}`}>困りごと {postCode("problem", s.problemPostId)}</Link>}
                {" ／ "}
                <Link href={`/posts/${s.solutionPostId}`}>挑戦 {postCode("solution", s.solutionPostId)}</Link>
              </p>
            ) : isMine ? (
              <form action={shareForge} className="share__form">
                <input type="hidden" name="sessionId" value={s.id} />
                <div>
                  <b>この企画書で、挑戦を始めますか？</b>
                  <p className="small dim">困りごと（クエスト）と、おすすめの解決策の「挑戦中」の二つの投稿になります。結果が出る前から共有するので、同じ悩みのチームや、一緒にやる仲間が見つかります。</p>
                </div>
                <button className="btn btn--primary">挑戦として共有する <span aria-hidden>→</span></button>
              </form>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
