import { db } from "./db";
import { listPosts, type Post } from "./data";
import { alignEffectText, type ChatMessage, type Plan } from "./ai";

// 賢者の工房（AI との壁打ち）の記録

export type ForgeSession = {
  id: number;
  userId: number;
  userName: string;
  teamId: number;
  teamCode: string;
  worry: string;
  messages: ChatMessage[];
  plan: Plan | null;
  demo: boolean;
  problemPostId: number | null;
  solutionPostId: number | null;
  createdAt: string;
  updatedAt: string;
};

type Row = Omit<ForgeSession, "messages" | "plan" | "demo"> & { messages: string; plan: string | null; demo: number };

const SELECT = `
  SELECT f.id, f.user_id AS userId, u.name AS userName, f.team_id AS teamId, t.code AS teamCode,
         f.worry, f.messages, f.plan, f.demo, f.problem_post_id AS problemPostId,
         f.solution_post_id AS solutionPostId, f.created_at AS createdAt, f.updated_at AS updatedAt
  FROM forge_sessions f JOIN users u ON u.id = f.user_id JOIN teams t ON t.id = f.team_id`;

function toSession(r: Row): ForgeSession {
  return { ...r, messages: JSON.parse(r.messages), plan: r.plan ? alignEffectText(JSON.parse(r.plan)) : null, demo: r.demo === 1 };
}

export function getForgeSession(id: number) {
  const r = db.prepare(`${SELECT} WHERE f.id = ?`).get(id) as Row | undefined;
  return r && toSession(r);
}

export function listForgeSessions(userId?: number) {
  const rows = (userId
    ? db.prepare(`${SELECT} WHERE f.user_id = ? ORDER BY f.updated_at DESC`).all(userId)
    : db.prepare(`${SELECT} ORDER BY f.updated_at DESC`).all()) as Row[];
  return rows.map(toSession);
}

export function saveMessages(id: number, messages: ChatMessage[], demo: boolean) {
  db.prepare("UPDATE forge_sessions SET messages = ?, demo = MAX(demo, ?), updated_at = datetime('now') WHERE id = ?")
    .run(JSON.stringify(messages), demo ? 1 : 0, id);
}

export function savePlan(id: number, plan: Plan, demo: boolean) {
  db.prepare("UPDATE forge_sessions SET plan = ?, demo = MAX(demo, ?), updated_at = datetime('now') WHERE id = ?")
    .run(JSON.stringify(plan), demo ? 1 : 0, id);
}

// 悩みの文章に近い社内の投稿を探す（AI に渡す「社内の事例」）。
// 言葉の重なりで数える簡単なもの。⚠️ 事例が増えたら、意味で探す形（埋め込み）に替える
export function searchCases(text: string, limit = 5): Post[] {
  // 漢字かカタカナを含む二文字（「請求」「コピ」「問い」）と、英語の一語（「Excel」）を手がかりにする。
  // 「書の」「てい」のような、助詞を含む二文字やひらがなだけの二文字は、どの文にもあるので数えない
  const grams = new Set<string>();
  for (const run of text.match(/[一-龯々ァ-ヶーぁ-ゟ]+/g) ?? []) {
    for (let i = 0; i < run.length - 1; i++) {
      const g = run.slice(i, i + 2);
      if (/[一-龯々ァ-ヶ]/.test(g) && !/[のをがにではともへやてっ]/.test(g)) grams.add(g);
    }
  }
  const words = new Set((text.match(/[A-Za-z][A-Za-z0-9]+/g) ?? []).map((w) => w.toLowerCase()));

  return listPosts()
    .map((p) => {
      const hay = `${p.title}${p.summary}`;
      const hayLower = hay.toLowerCase();
      // 似ているかどうかは、文の重なりだけで決める
      let match = 0;
      for (const g of grams) if (hay.includes(g)) match += 1;
      for (const w of words) if (hayLower.includes(w)) match += 2;
      for (const w of [...p.tags, ...p.tools, p.category]) if (text.includes(w)) match += 3;
      // 広がっている解決策は、並べるときだけ前に出す
      const rank = match + (p.kind === "solution" ? 2 + p.adoptions : 0);
      return { p, match, rank };
    })
    .filter((x) => x.match >= 3)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map((x) => x.p);
}
