import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap page page--narrow">
      <p className="eyebrow">404 / NOT FOUND</p>
      <h1 className="page__title">見つかりませんでした</h1>
      <p className="lead">消されたか、番号がちがうのかもしれません。</p>
      <Link href="/explore" className="btn btn--ghost">投稿を探す</Link>
    </div>
  );
}
