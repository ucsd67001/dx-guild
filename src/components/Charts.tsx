import type { Funnel, WeekBucket } from "@/lib/admin";

// ギルマスの執務室のグラフ。SVG を手で描く（ライブラリを足さない）。
// 色：困りごと＝青緑、解決策＝緑（どちらも数字を添える。緑は地との差が小さいため）
// 触れると、その棒の数字が出る（<title>）

function topRounded(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `M${x} ${y + h}V${y + rr}Q${x} ${y} ${x + rr} ${y}H${x + w - rr}Q${x + w} ${y} ${x + w} ${y + rr}V${y + h}Z`;
}

export function WeeklyChart({ data }: { data: WeekBucket[] }) {
  const W = 640, H = 240, L = 30, R = 8, T = 18, B = 30;
  const max = Math.max(2, ...data.flatMap((d) => [d.problems, d.solutions]));
  const top = Math.ceil(max / 2) * 2;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const gw = (W - L - R) / data.length;
  const bw = Math.min(16, gw * 0.28);
  const ticks = [0, top / 2, top];

  return (
    <figure className="chart">
      <div className="legend mono">
        <span><i className="legend__sw legend__sw--problem" />困りごと</span>
        <span><i className="legend__sw legend__sw--solution" />解決策</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="週ごとの投稿数">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className={t === 0 ? "chart__base" : "chart__grid"} />
            <text x={L - 8} y={y(t) + 4} className="chart__tick" textAnchor="end">{t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = L + gw * i + gw / 2;
          const bars = [
            { v: d.problems, cls: "problem", x: cx - bw - 1, name: "困りごと" },
            { v: d.solutions, cls: "solution", x: cx + 1, name: "解決策" },
          ];
          return (
            <g key={d.label} className="chart__group">
              <rect x={cx - gw / 2} y={T} width={gw} height={H - T - B} className="chart__hit" />
              {bars.map((b) => (
                <g key={b.cls}>
                  <path d={topRounded(b.x, y(b.v), bw, y(0) - y(b.v))} className={`chart__bar chart__bar--${b.cls}`}>
                    <title>{`${d.label}　${b.name} ${b.v}件`}</title>
                  </path>
                  {b.v > 0 && <text x={b.x + bw / 2} y={y(b.v) - 5} className="chart__val" textAnchor="middle">{b.v}</text>}
                </g>
              ))}
              <text x={cx} y={H - 10} className="chart__tick" textAnchor="middle">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <details className="chart__table">
        <summary className="mono">表で見る</summary>
        <table>
          <thead><tr><th>週</th><th>困りごと</th><th>解決策</th></tr></thead>
          <tbody>
            {data.map((d) => <tr key={d.label}><td>{d.label}</td><td>{d.problems}</td><td>{d.solutions}</td></tr>)}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

// 漏斗：段ごとの数と、前の段からの割合
export function FunnelBars({ data }: { data: Funnel }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ol className="funnel">
      {data.map((d, i) => {
        const prev = i > 0 ? data[i - 1].value : 0;
        return (
          <li key={d.en} title={d.note}>
            <span className="funnel__label">
              <span className="mono dim">{d.en}</span>
              {d.label}
            </span>
            <span className="funnel__track">
              <span className="funnel__fill" style={{ width: `${(d.value / max) * 100}%` }} />
            </span>
            <span className="funnel__value mono">{d.value}</span>
            <span className="funnel__rate mono dim">{i > 0 && prev > 0 ? `${Math.round((d.value / prev) * 100)}%` : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function HBars({ data }: { data: { label: string; value: number; note?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="hbars">
      {data.map((d) => (
        <li key={d.label} title={d.note}>
          <span className="hbars__label">{d.label}</span>
          <span className="hbars__track"><span style={{ width: `${(d.value / max) * 100}%` }} /></span>
          <span className="mono">{d.value}</span>
          {d.note && <span className="small dim">{d.note}</span>}
        </li>
      ))}
    </ul>
  );
}
