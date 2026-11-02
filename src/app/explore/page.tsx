import Link from "next/link";
import type { Metadata } from "next";
import { listPosts, listTeams, type PostFilter } from "@/lib/data";
import { CATEGORIES, STAGES, TOOLS, type Kind, type Stage } from "@/lib/constants";
import { PostCard } from "@/components/PostCard";

export const metadata: Metadata = { title: "探す" };

type Search = Record<string, string | string[] | undefined>;

export default async function Explore({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const stage = (one("stage") in STAGES ? one("stage") : undefined) as Stage | undefined;
  // 段階を選んだら、種類は解決策に決まる
  const kind = (stage ? "solution" : ["problem", "solution"].includes(one("kind")) ? one("kind") : undefined) as Kind | undefined;
  const sort = (["new", "popular", "impact"].includes(one("sort")) ? one("sort") : "new") as PostFilter["sort"];
  const filter: PostFilter = {
    q: one("q") || undefined,
    kind,
    stage,
    category: one("category") || undefined,
    tool: one("tool") || undefined,
    team: Number(one("team")) || undefined,
    open: one("open") === "1",
    sort,
  };
  const posts = listPosts(filter);
  const teams = listTeams();

  // 種類と段階のタブは、ほかの条件を残したまま切り替える
  const withTab = (key?: "kind" | "stage", value?: string) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === "string" && v && !["kind", "stage", "open"].includes(k)) p.set(k, v);
    }
    if (key && value) p.set(key, value);
    const s = p.toString();
    return s ? `/explore?${s}` : "/explore";
  };
  const tab = filter.open ? "open" : stage ?? kind ?? "all";

  return (
    <div className="wrap page">
      <p className="eyebrow">EXPLORE</p>
      <h1 className="page__title">困りごと・挑戦・事例を探す</h1>
      <p className="lead">
        よそのチームが、もう同じことに悩んでいたり、いま挑戦していたり、もう解いていたりするかもしれません。
        うまくいかなかった挑戦も「学び」として残っています。
      </p>

      <div className="tabs" role="tablist">
        <Link href={withTab()} className={tab === "all" ? "is-active" : undefined}>すべて</Link>
        <Link href={withTab("kind", "problem")} className={tab === "problem" ? "is-active" : undefined}>
          <i className="kind-dot kind-dot--problem" />困りごと
        </Link>
        <Link href={withTab("stage", "challenge")} className={tab === "challenge" ? "is-active" : undefined}>
          {STAGES.challenge}
        </Link>
        <Link href={withTab("stage", "success")} className={tab === "success" ? "is-active" : undefined}>
          <i className="kind-dot kind-dot--solution" />{STAGES.success}
        </Link>
        <Link href={withTab("stage", "lesson")} className={tab === "lesson" ? "is-active" : undefined}>
          {STAGES.lesson}
        </Link>
        <Link href="/explore?open=1&sort=popular" className={tab === "open" ? "is-active" : undefined}>挑戦者待ち</Link>
      </div>

      <form className="filters" action="/explore">
        {stage ? <input type="hidden" name="stage" value={stage} /> : kind && <input type="hidden" name="kind" value={kind} />}
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
          <Link href={stage ? withTab("stage", stage) : withTab("kind", kind)} className="clear">条件を外す</Link>
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
