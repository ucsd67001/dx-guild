import Link from "next/link";
import { getCurrentUser, listPosts } from "@/lib/data";
import { searchSolutions } from "@/lib/forge";
import { listAdventurers } from "@/lib/game";
import { startForge } from "@/lib/actions";
import { PRODUCT } from "@/lib/constants";
import { PostCard } from "@/components/PostCard";
import { StepTrack } from "@/components/StepTrack";

// 書き方の例。悩みのままでも、問題・課題・解決策の言葉でもよいことを見せる
const EXAMPLES = ["議事録づくりがつらい", "承認がどこで止まっているか分からない", "同じ問い合わせに何度も答えている", "Power Automate"];

type Props = { searchParams: Promise<{ q?: string }> };

// トップは「探す」だけ。悩み・問題・課題・解決策のどれからでも成功事例を探し、
// 無ければ、その言葉のまま賢者との壁打ちに入る。新着とランキングは下に小さく
export default async function Home({ searchParams }: Props) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 400);
  const me = await getCurrentUser();
  const found = q ? searchSolutions(q) : [];
  // 成功事例が無くても、同じことに挑戦中の人がいれば、仲間になれる
  const trying = q && !found.length ? searchSolutions(q, "challenge", 2) : [];
  const fresh = listPosts({ stage: "success", sort: "new", limit: 3 });
  const top = listAdventurers().slice(0, 3);

  return (
    <>
      <section className="hero hero--search">
        <div className="wrap">
          <p className="eyebrow">
            <span className="eyebrow__dot" />
            {PRODUCT.en} / IT DIV. IDEA &amp; SOLUTION GUILD
          </p>
          <h1 className="hero__title">
            ひとりの成功を、<span className="hero__accent">みんな</span>の成果に<span className="hero__dot">.</span>
          </h1>
          <p className="lead">
            悩みのままでも、問題・課題・試したい解決策でも。書いてみてください。よそのチームの<b>成功事例</b>を探します。
          </p>
          <form action="/" className="search" role="search">
            <input
              name="q"
              type="search"
              defaultValue={q}
              maxLength={400}
              placeholder="例：毎週の集計がコピペばかりでめんどう"
              aria-label="悩み・問題・課題・解決策"
            />
            <button className="btn btn--primary">
              成功事例を探す <span aria-hidden>→</span>
            </button>
          </form>
          {!q && (
            <div className="examples">
              {EXAMPLES.map((e) => (
                <Link key={e} href={`/?q=${encodeURIComponent(e)}`} className="example">
                  {e}
                </Link>
              ))}
            </div>
          )}
          <p className="hero__me mono dim">
            SIGNED IN AS <b>{me.name}</b> / {me.teamName}（{me.teamCode}）
          </p>
        </div>
      </section>

      {q && (
        <section className="wrap section section--tight">
          <div className="section__head">
            <div>
              <p className="eyebrow eyebrow--sm">SUCCESS CASES</p>
              <h2 className="section__title">
                「{q.length > 30 ? `${q.slice(0, 30)}…` : q}」に近い成功事例 <span className="mono dim">{found.length}</span>
              </h2>
            </div>
            <Link href="/" className="more mono">
              CLEAR ×
            </Link>
          </div>
          {found.length > 0 && (
            <div className="grid grid--3">
              {found.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
          <div className={`fallback${found.length ? "" : " fallback--none"}`}>
            <div>
              <b>{found.length ? "ぴったりの事例がなければ" : "まだ、近い成功事例はありません"}</b>
              <p className="small dim">
                賢者（AI）と壁打ちして、この悩みから、問題・課題・解決策・実現方法まで一緒に作りましょう。いま書いた言葉から始めます。
              </p>
              <StepTrack compact />
              {trying.length > 0 && (
                <p className="fallback__also small">
                  <span className="stage stage--challenge">挑戦中</span>
                  同じことに挑戦している人がいます：
                  {trying.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 && "・"}
                      <Link href={`/posts/${p.id}`}>{p.title}</Link>（{p.teamCode}）
                    </span>
                  ))}
                </p>
              )}
            </div>
            <form action={startForge}>
              <input type="hidden" name="worry" value={q} />
              <button className={`btn ${found.length ? "btn--ghost" : "btn--primary"}`}>
                賢者と壁打ちする <span aria-hidden>→</span>
              </button>
            </form>
          </div>
        </section>
      )}

      <section className="wrap glance">
        <div className="glance__col">
          <div className="glance__head">
            <span className="eyebrow eyebrow--sm">NEW SUCCESSES</span>
            <Link href="/explore?stage=success" className="more mono">ALL →</Link>
          </div>
          <ul className="glance__list">
            {fresh.map((p) => (
              <li key={p.id}>
                <Link href={`/posts/${p.id}`}>{p.title}</Link>
                <span className="mono dim">
                  {p.teamCode}
                  {p.hours ? ` · −${p.hours}h/月` : ""}
                  {p.adoptions ? ` · 横展開 ${p.adoptions}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glance__col">
          <div className="glance__head">
            <span className="eyebrow eyebrow--sm">TOP ADVENTURERS</span>
            <Link href="/community" className="more mono">COMMUNITY →</Link>
          </div>
          <ol className="glance__list glance__list--rank">
            {top.map((a, i) => (
              <li key={a.userId}>
                <span className="glance__rank mono">{i + 1}</span>
                <span>
                  {a.name} <span className="dim small">{a.teamCode}</span>
                </span>
                <span className="mono dim">
                  Lv{a.level} · {a.xp.toLocaleString()} XP
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
