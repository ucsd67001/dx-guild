import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTeam, listAdoptedBy, listMembers, listPosts, listTeamSummaries } from "@/lib/data";
import { PostCard } from "@/components/PostCard";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getTeam(Number((await params).id))?.name ?? "見つかりません" };
}

export default async function TeamPage({ params }: Props) {
  const teamId = Number((await params).id);
  const team = listTeamSummaries().find((t) => t.id === teamId);
  if (!team) notFound();

  const members = listMembers(team.id);
  const problems = listPosts({ team: team.id, kind: "problem" });
  const solutions = listPosts({ team: team.id, kind: "solution", sort: "popular" });
  const adopted = listAdoptedBy(team.id);

  return (
    <div className="wrap page">
      <nav className="crumbs mono">
        <Link href="/teams">TEAMS</Link>
        <span>/</span>
        <span>{team.code}</span>
      </nav>

      <div className="team-head">
        <div>
          <p className="eyebrow">TEAM / {team.code}</p>
          <h1 className="page__title">{team.name}</h1>
          <p className="lead">{team.mission}</p>
          <ul className="members">
            {members.map((m) => (
              <li key={m.id}>
                <span className="avatar avatar--sm" aria-hidden>{m.name.slice(0, 1)}</span>
                {m.name}
                {m.role && <small className="dim">{m.role}</small>}
              </li>
            ))}
          </ul>
        </div>
        <div className="team-head__stats">
          <Mini label="PROBLEMS" value={team.problems} />
          <Mini label="CHALLENGES" value={team.solutions} />
          <Mini label="GIVEN" value={team.given} accent />
          <Mini label="TAKEN" value={team.taken} />
        </div>
      </div>

      <TeamSection en="CHALLENGES & SUCCESSES" title="このチームの挑戦と成功事例" posts={solutions} empty="まだ挑戦の投稿はありません。" />
      <TeamSection en="PROBLEMS" title="このチームの困りごと" posts={problems} empty="まだ困りごとの投稿はありません。" />
      <TeamSection en="ADOPTED FROM OTHERS" title="よそのチームから取り入れた成功事例" posts={adopted} empty="まだ取り入れた成功事例はありません。" />
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`mini${accent ? " mini--accent" : ""}`}>
      <span className="mono">{label}</span>
      <b className="mono">{value}</b>
    </div>
  );
}

function TeamSection({ en, title, posts, empty }: { en: string; title: string; posts: Awaited<ReturnType<typeof listPosts>>; empty: string }) {
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
        <div className="grid grid--3">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
      ) : (
        <div className="empty empty--inline"><p>{empty}</p></div>
      )}
    </section>
  );
}
