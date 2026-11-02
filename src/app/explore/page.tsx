import Link from "next/link";
import type { Metadata } from "next";
import { listPosts, listTeams, type PostFilter } from "@/lib/data";
import { CATEGORIES, TOOLS, type Kind } from "@/lib/constants";
import { PostCard } from "@/components/PostCard";

export const metadata: Metadata = { title: "探す" };

type Search = Record<string, string | string[] | undefined>;

export default async function Explore({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const kind = (["problem", "solution"].includes(one("kind")) ? one("kind") : undefined) as Kind | undefined;
  const sort = (["new", "popular", "impact"].includes(one("sort")) ? one("sort") : "new") as PostFilter["sort"];
  const filter: PostFilter = {
    q: one("q") || undefined,
    kind,
    category: one("category") || undefined,
    tool: one("tool") || undefined,
    team: Number(one("team")) || undefined,
    open: one("open") === "1",
    sort,
  };
  const posts = listPosts(filter);
  const teams = listTeams();

  // 種類のタブは、ほかの条件を残したまま切り替える
  const withKind = (k?: string) => {
    const p = new URLSearchParams();
    for (const [key, v] of Object.entries(sp)) if (typeof v === "string" && v && key !== "kind" && key !== "open") p.set(key, v);
    if (k) p.set("kind", k);
    const s = p.toString();
    return s ? `/explore?${s}` : "/explore";
  };

  return (
    <div className="wrap page">
      <p className="eyebrow">EXPLORE</p>
      <h1 className="page__title">困りごとと解決策を探す</h1>
      <p className="lead">よそのチームが、もう同じことに悩んでいたり、もう解いていたりするかもしれません。</p>

      <div className="tabs" role="tablist">
        <Link href={withKind()} className={!kind && !filter.open ? "is-active" : undefined}>すべて</Link>
        <Link href={withKind("problem")} className={kind === "problem" && !filter.open ? "is-active" : undefined}>
          <i className="kind-dot kind-dot--problem" />困りごと
        </Link>
        <Link href={withKind("solution")} className={kind === "solution" ? "is-active" : undefined}>
          <i className="kind-dot kind-dot--solution" />解決策
        </Link>
        <Link href="/explore?open=1&sort=popular" className={filter.open ? "is-active" : undefined}>解決策待ち</Link>
      </div>

      <form className="filters" action="/explore">
        {kind && <input type="hidden" name="kind" value={kind} />}
        {filter.open && <input type="hidden" name="open" value="1" />}
        <label className="field field--grow">
          <span className="field__label mono">KEYWORD</span>
          <input name="q" defaultValue={filter.q} placeholder="例：議事録、棚卸し、Power Automate" />
        </label>
        <label className="field">
          <span className="field__label mono">CATEGORY</span>
          <select name="category" defaultValue={filter.category ?? ""}>
            <option value="">すべての分類</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field__label mono">TOOL</span>
          <select name="tool" defaultValue={filter.tool ?? ""}>
            <option value="">すべてのツール</option>
            {TOOLS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field__label mono">TEAM</span>
          <select name="team" defaultValue={filter.team ?? ""}>
            <option value="">すべてのチーム</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field__label mono">SORT</span>
          <select name="sort" defaultValue={sort}>
            <option value="new">新しい順</option>
            <option value="popular">反響の大きい順</option>
            <option value="impact">時間の大きい順</option>
          </select>
        </label>
        <button className="btn btn--primary">絞り込む</button>
      </form>

      <p className="result-count mono">
        {posts.length} RESULTS
        {(filter.q || filter.category || filter.tool || filter.team) && (
          <Link href={withKind(kind)} className="clear">条件を外す</Link>
        )}
      </p>

      {posts.length ? (
        <div className="grid grid--3">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      ) : (
        <div className="empty">
          <p>当てはまる投稿は、まだありません。</p>
          <Link href="/new?kind=problem" className="btn btn--ghost">この困りごとを最初に出す</Link>
        </div>
      )}
    </div>
  );
}
