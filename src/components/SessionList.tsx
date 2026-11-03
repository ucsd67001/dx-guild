import Link from "next/link";
import type { ForgeSession } from "@/lib/forge";
import { fmtDate } from "@/lib/constants";

// 賢者との対話の一覧（賢者の工房とマイページで使う）
export function SessionList({ sessions, showWho }: { sessions: ForgeSession[]; showWho?: boolean }) {
  return (
    <ul className="sessions">
      {sessions.map((s) => {
        const status = s.solutionPostId ? "共有ずみ" : s.plan ? "企画書あり" : "対話中";
        return (
          <li key={s.id}>
            <Link href={`/forge/${s.id}`}>
              <span className={`status status--${s.solutionPostId ? "shared" : s.plan ? "planned" : "talking"}`}>{status}</span>
              <span className="sessions__title">{s.plan?.title ?? s.worry}</span>
              {showWho && <span className="dim small">{s.userName}（{s.teamCode}）</span>}
              <span className="mono dim small">{fmtDate(s.updatedAt)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
