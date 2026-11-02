import Link from "next/link";
import type { Post } from "@/lib/data";
import { KIND_LABEL, STAGES, fmtDate, postCode } from "@/lib/constants";

export function KindBadge({ post }: { post: Pick<Post, "kind" | "stage"> }) {
  return (
    <span className={`badge badge--${post.kind}`}>
      <i aria-hidden />
      {KIND_LABEL[post.kind]}
      {post.stage && <em>{STAGES[post.stage]}</em>}
    </span>
  );
}

export function PostCard({ post }: { post: Post }) {
  const chips = [...post.tools, ...post.tags.map((t) => `#${t}`)].slice(0, 5);
  return (
    <Link href={`/posts/${post.id}`} className={`card card--${post.kind}`}>
      <div className="card__meta">
        <KindBadge post={post} />
        <span className="mono dim">{postCode(post.kind, post.id)}</span>
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
            <Metric value={post.solutions} unit="件" label="SOLUTIONS" warn={post.solutions === 0} />
            {post.hours != null && <Metric value={post.hours} unit="h／月" label="MANUAL" />}
          </>
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
