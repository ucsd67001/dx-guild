import Link from "next/link";
import { getCurrentUser, getStats, listFlows, listPosts, listTeamSummaries } from "@/lib/data";
import { PRODUCT } from "@/lib/constants";
import { FlowMap } from "@/components/FlowMap";
import { PostCard } from "@/components/PostCard";

export default async function Home() {
  const me = await getCurrentUser();
  const stats = getStats();
  const waiting = listPosts({ open: true, sort: "popular", limit: 3 });
  const challenging = listPosts({ stage: "challenge", sort: "popular", limit: 3 });
  const spreading = listPosts({ stage: "success", sort: "popular", limit: 3 });
  const latest = listPosts({ sort: "new", limit: 6 });

  return (
    <>
      <section className="hero">
        <div className="wrap hero__inner">
          <div className="hero__copy">
            <p className="eyebrow">
              <span className="eyebrow__dot" />
              {PRODUCT.en} / IT DIV. IDEA &amp; SOLUTION GUILD
            </p>
            <h1 className="hero__title">
              ひとりの成功を、
              <br />
              <span className="hero__accent">みんな</span>の成果に<span className="hero__dot">.</span>
            </h1>
            <p className="lead">
              悩んだら、まずギルドへ。成功事例をそのまま真似る、事例から閃く、賢者（AI）と壁打ちする。
              やってみて成功したら、次のだれかが使える事例として残す。IT Div. の成果を、みんなで量産するギルドです。
            </p>
            <div className="hero__actions">
              <Link href="/forge" className="btn btn--primary">
                賢者に相談する <span aria-hidden>→</span>
              </Link>
              <Link href="/explore" className="btn btn--ghost">
                成功事例を探す
              </Link>
            </div>
            <p className="hero__me mono dim">
              SIGNED IN AS <b>{me.name}</b> / {me.teamName}（{me.teamCode}）
            </p>
          </div>
          <div className="hero__visual">
            <div className="frame">
              <span className="frame__label mono">LIVE / 横展開マップ</span>
              <FlowMap teams={listTeamSummaries()} flows={listFlows()} compact />
              <Link href="/teams" className="frame__link mono">
                VIEW ALL GUILDS →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap stats">
        <Stat label="PROBLEMS" title="困りごと" value={stats.problems} note={`うち挑戦者待ち ${stats.openProblems}件`} />
        <Stat label="SUCCESSES" title="成功事例" value={stats.successes} note={`いま挑戦中 ${stats.challenges}件・学び ${stats.lessons}件`} />
        <Stat label="ADOPTIONS" title="横展開" value={stats.adoptions} note="ほかのチームが取り入れた数" accent />
        <Stat label="HOURS SAVED / MONTH" title="減った時間（月）" value={Math.round(stats.hoursSaved)} unit="h" note="投稿者の申告 × 使っているチーム数" />
      </section>

      <section className="wrap steps">
        {[
          ["01", "事例を探す", "よそのチームが、もう同じことを解いているかもしれない。"],
          ["02", "賢者と企画する", "悩みのひとことから、あるべき姿・課題・解決策・効果の試算まで。"],
          ["03", "挑戦を共有する", "やり始めた時点で共有し、仲間を募る。うまくいかなくても「学び」として残る。"],
          ["04", "成功を広げる", "成功したら成功事例に。よそのチームが取り入れたら「横展開」。行いが XP になる。"],
        ].map(([n, t, d]) => (
          <div key={n} className="step">
            <span className="step__n mono">{n}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        ))}
      </section>

      <Section en="OPEN QUESTS" title="挑戦者を待っているクエスト（報酬つき）" more="/explore?open=1&sort=popular">
        <div className="grid grid--3">
          {waiting.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      </Section>

      <Section en="CHALLENGING NOW" title="いま挑戦中（一緒にやる仲間を募集中）" more="/explore?stage=challenge&sort=popular">
        <div className="grid grid--3">
          {challenging.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      </Section>

      <Section en="SPREADING NOW" title="いま横に広がっている成功事例" more="/explore?stage=success&sort=popular">
        <div className="grid grid--3">
          {spreading.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      </Section>

      <Section en="LATEST" title="新着" more="/explore">
        <div className="grid grid--3">
          {latest.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      </Section>
    </>
  );
}

function Stat({
  label,
  title,
  value,
  unit,
  note,
  accent,
}: {
  label: string;
  title: string;
  value: number;
  unit?: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div className={`stat${accent ? " stat--accent" : ""}`}>
      <span className="stat__label mono">{label}</span>
      <span className="stat__value mono">
        {value.toLocaleString()}
        {unit && <small>{unit}</small>}
      </span>
      <span className="stat__title">{title}</span>
      <span className="stat__note dim">{note}</span>
    </div>
  );
}

function Section({ en, title, more, children }: { en: string; title: string; more: string; children: React.ReactNode }) {
  return (
    <section className="wrap section">
      <div className="section__head">
        <div>
          <p className="eyebrow eyebrow--sm">{en}</p>
          <h2 className="section__title">{title}</h2>
        </div>
        <Link href={more} className="more mono">
          SEE ALL →
        </Link>
      </div>
      {children}
    </section>
  );
}
