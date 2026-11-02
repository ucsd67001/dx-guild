import Link from "next/link";
import type { Post } from "@/lib/data";
import { KIND_LABEL, STAGES, fmtDate, postCode } from "@/lib/constants";
import { bountyOf } from "@/lib/game";

// 段階（挑戦中・成功事例・学び）は、色の札で見せる
export function KindBadge({ post }: { post: Pick<Post, "kind" | "stage"> }) {
  return (
    <span className={`badge badge--${post.kind}`}>
      <i aria-hidden />
      {KIND_LABEL[post.kind]}
      {post.stage && <em className={`stage stage--${post.stage}`}>{STAGES[post.stage]}</em>}
    </span>
  );
}

export function PostCard({ post }: { post: Post }) {
  const chips = [...post.tools, ...post.tags.map((t) => `#${t}`)].slice(0, 5);
  return (
    <Link href={`/posts/${post.id}`} className={`card card--${post.kind}${post.stage ? ` card--${post.stage}` : ""}`}>
      <div className="card__meta">
        <KindBadge post={post} />
        <span className="mono dim">{postCode(post.kind, post.id)}</span>
        {post.kind === "problem" && post.solutions === 0 && (
          <span className="bounty mono" title="この困りごとへの挑戦が成功すると、もらえる経験値">+{bountyOf(post.metoo)} XP</span>
        )}
        <span className="card__team mono">{post.teamCode}</span>
      </div>
      <h3 className="card__title">{post.title}</h3>
      <p className="card__summary">{post.summary}</p>
      <ul className="chips">
        {chips.map((c) => (
          <li key={c} className={c.startsWith("#") ? "chip chip--tag" : "chip"}>
            {c}
          </li>
        ))}
      </ul>
      <div className="card__foot">
        {post.kind === "problem" ? (
          <>
            <Metric value={post.metoo} unit="人が同じく困っている" label="ME TOO" />
            <Metric value={post.solutions} unit="件の挑戦・成功事例" label="CHALLENGES" warn={post.solutions === 0} />
            {post.hours != null && <Metric value={post.hours} unit="h／月" label="MANUAL" />}
          </>
        ) : post.stage === "challenge" ? (
          <>
            <Metric value={post.join} unit="人が一緒にやりたい" label="JOIN" strong />
            {post.hours != null && <Metric value={`−${post.hours}`} unit="h／月（見込み）" label="EXPECTED" />}
          </>
        ) : post.stage === "lesson" ? (
          <Metric value={post.want} unit="人が参考になった" label="HELPFUL" />
        ) : (
          <>
            <Metric value={post.adoptions} unit="チーム" label="ADOPTED" strong />
            <Metric value={post.want} unit="人" label="WANT" />
            {post.hours != null && <Metric value={`−${post.hours}`} unit="h／月" label="SAVED" />}
          </>
        )}
        <span className="card__date mono dim">{fmtDate(post.createdAt)}</span>
      </div>
    </Link>
  );
}

function Metric({
  value,
  unit,
  label,
  strong,
  warn,
}: {
  value: number | string;
  unit: string;
  label: string;
  strong?: boolean;
  warn?: boolean;
}) {
  return (
    <span className={`metric${strong ? " metric--strong" : ""}${warn ? " metric--warn" : ""}`} title={unit}>
      <span className="metric__label">{label}</span>
      <span className="metric__value">{value}</span>
    </span>
  );
}
