import Link from "next/link";
import type { Metadata } from "next";
import { listFlows, listTeamSummaries } from "@/lib/data";
import { FlowMap } from "@/components/FlowMap";

export const metadata: Metadata = { title: "ギルド" };

export default function Teams() {
  const teams = listTeamSummaries();
  const flows = listFlows();

  return (
    <div className="wrap page">
      <p className="eyebrow">GUILDS</p>
      <h1 className="page__title">ギルド（チーム）と横展開の流れ</h1>
      <p className="lead">どのチームの工夫が、どのチームへ渡っているか。線の向きは「作ったチーム → 取り入れたチーム」です。</p>

      <div className="teams-layout">
        <div className="frame frame--map">
          <span className="frame__label mono">FLOW MAP</span>
          <FlowMap teams={teams} flows={flows} />
          <div className="legend mono">
            <span><i className="legend__dot legend__dot--source" />解決策を広げたチーム</span>
            <span><i className="legend__line" />横展開の向き</span>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>チーム</th>
              <th className="num">困りごと</th>
              <th className="num">解決策</th>
              <th className="num" title="このチームの解決策を、よそのチームが取り入れた数">広げた</th>
              <th className="num" title="よそのチームの解決策を、このチームが取り入れた数">取り入れた</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link href={`/teams/${t.id}`} className="table__team">
                    <span className="mono code">{t.code}</span>
                    <span>
                      {t.name}
                      <small className="dim">{t.mission}</small>
                    </span>
                  </Link>
                </td>
                <td className="num mono">{t.problems}</td>
                <td className="num mono">{t.solutions}</td>
                <td className="num mono">
                  <Bar value={t.given} max={Math.max(...teams.map((x) => x.given), 1)} />
                </td>
                <td className="num mono">{t.taken}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <span className="bar">
      <span className="bar__fill" style={{ width: `${(value / max) * 100}%` }} />
      <span className="bar__value">{value}</span>
    </span>
  );
}
