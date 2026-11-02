import type { Flow, TeamSummary } from "@/lib/data";

// 横展開マップ：チームを円に並べ、解決策が渡った向きに線を引く。
// 線の上を点が流れる＝「よそのチームへ広がっていく」ことを目で見せる
export function FlowMap({ teams, flows, compact = false }: { teams: TeamSummary[]; flows: Flow[]; compact?: boolean }) {
  // 名前の字がはみ出さないよう、輪の外に余白をとる
  const size = 620;
  const c = size / 2;
  const r = 172;
  const pos = new Map(
    teams.map((t, i) => {
      const a = (i / teams.length) * Math.PI * 2 - Math.PI / 2;
      return [t.id, { x: c + r * Math.cos(a), y: c + r * Math.sin(a), a }];
    }),
  );
  const total = flows.reduce((s, f) => s + f.count, 0);

  return (
    <svg
      className={`flowmap${compact ? " flowmap--compact" : ""}`}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`横展開マップ。チームのあいだで、のべ${total}件の解決策が渡っています`}
    >
      <defs>
        <marker id="fm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 1 L9 5 L0 9 z" className="flowmap__arrow" />
        </marker>
        {flows.map((f) => {
          const a = pos.get(f.from)!;
          const b = pos.get(f.to)!;
          return (
            <linearGradient key={`g${f.from}-${f.to}`} id={`fm-g${f.from}-${f.to}`} gradientUnits="userSpaceOnUse" x1={a.x} y1={a.y} x2={b.x} y2={b.y}>
              <stop offset="0" className="flowmap__stop-from" />
              <stop offset="1" className="flowmap__stop-to" />
            </linearGradient>
          );
        })}
      </defs>

      {/* 目盛りの輪 */}
      <circle cx={c} cy={c} r={r + 40} className="flowmap__ring flowmap__ring--outer" />
      <circle cx={c} cy={c} r={r} className="flowmap__ring" />
      <circle cx={c} cy={c} r={r * 0.42} className="flowmap__ring flowmap__ring--inner" />
      {Array.from({ length: 72 }, (_, i) => {
        const a = (i / 72) * Math.PI * 2;
        const long = i % 9 === 0;
        const r1 = r + 34;
        const r2 = r + (long ? 46 : 40);
        return (
          <line key={i} x1={c + r1 * Math.cos(a)} y1={c + r1 * Math.sin(a)} x2={c + r2 * Math.cos(a)} y2={c + r2 * Math.sin(a)} className={long ? "flowmap__tick flowmap__tick--long" : "flowmap__tick"} />
        );
      })}

      {/* 流れ */}
      {flows.map((f, i) => {
        const a = pos.get(f.from)!;
        const b = pos.get(f.to)!;
        // 中心へ引き寄せた曲線。向きが逆の流れと重ならないよう、少し横へずらす
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const qx = mx * 0.45 + c * 0.55 + (-dy / len) * 22;
        const qy = my * 0.45 + c * 0.55 + (dx / len) * 22;
        // 端を節の円の外で止める
        const trim = (p: { x: number; y: number }, toward: { x: number; y: number }, by: number) => {
          const l = Math.hypot(toward.x - p.x, toward.y - p.y) || 1;
          return { x: p.x + ((toward.x - p.x) / l) * by, y: p.y + ((toward.y - p.y) / l) * by };
        };
        const s = trim(a, { x: qx, y: qy }, 20);
        const e = trim(b, { x: qx, y: qy }, 22);
        const d = `M${s.x.toFixed(1)} ${s.y.toFixed(1)} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
        return (
          <g key={`${f.from}-${f.to}`}>
            <path d={d} className="flowmap__edge" stroke={`url(#fm-g${f.from}-${f.to})`} strokeWidth={1 + f.count * 0.9} markerEnd="url(#fm-arrow)" />
            <path d={d} pathLength={100} className="flowmap__pulse" style={{ animationDelay: `${(i * 0.37) % 2.4}s` }} />
          </g>
        );
      })}

      {/* 中心の読み。線はこの下をくぐる */}
      <circle cx={c} cy={c} r={50} className="flowmap__hub" />
      <text x={c} y={c - 10} className="flowmap__center-label">ADOPTIONS</text>
      <text x={c} y={c + 26} className="flowmap__center-value">{total}</text>

      {/* チーム */}
      {teams.map((t) => {
        const p = pos.get(t.id)!;
        const lx = c + (r + 64) * Math.cos(p.a);
        const ly = c + (r + 64) * Math.sin(p.a);
        const anchor = Math.abs(Math.cos(p.a)) < 0.3 ? "middle" : Math.cos(p.a) > 0 ? "start" : "end";
        const lxAdj = anchor === "start" ? lx - 12 : anchor === "end" ? lx + 12 : lx;
        return (
          <a key={t.id} href={`/teams/${t.id}`} className="flowmap__node">
            {t.given > 0 && <circle cx={p.x} cy={p.y} r={16} className="flowmap__halo" />}
            <circle cx={p.x} cy={p.y} r={16} className={t.given > 0 ? "flowmap__dot is-source" : "flowmap__dot"} />
            <circle cx={p.x} cy={p.y} r={4} className="flowmap__core" />
            <text x={lxAdj} y={ly - 2} textAnchor={anchor} className="flowmap__code">{t.code}</text>
            {!compact && (
              <text x={lxAdj} y={ly + 15} textAnchor={anchor} className="flowmap__name">{t.name}</text>
            )}
          </a>
        );
      })}
    </svg>
  );
}
