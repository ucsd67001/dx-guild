import { db } from "./db";

// ゲーミフィケーション。XP は「記録」から毎回数え直す（XP の表を別に持たない）。
// だから、投稿や横展開を取り消せば XP も自然に減り、数字がずれない

export const XP_RULES = [
  { key: "problems", label: "クエスト（困りごと）を出した", xp: 10 },
  { key: "solutions", label: "解決策を共有した", xp: 30 },
  { key: "bounty", label: "クエストの報酬（困りごとに答えた解決策）", xp: 0 }, // 報酬は困りごとごとに違う
  { key: "given", label: "自分の解決策が、よそのチームに横展開された", xp: 50 },
  { key: "taken", label: "よそのチームの解決策を取り入れた", xp: 20 },
  { key: "plans", label: "賢者と企画書をまとめた", xp: 15 },
  { key: "reactionsReceived", label: "「うちも」「使いたい」をもらった", xp: 3 },
  { key: "reactionsGiven", label: "「うちも」「使いたい」を押した", xp: 1 },
  { key: "comments", label: "コメントした", xp: 2 },
] as const;

type Key = (typeof XP_RULES)[number]["key"];
export type Counts = Record<Key, number>;

// クエストの報酬：困りごとに解決策で答えた人がもらう。共感が多いほど大きい
export function bountyOf(metoo: number) {
  return 20 + metoo * 5;
}

// レベル L に必要な XP ＝ 30 × (L−1) × L（0, 60, 180, 360, 600, 900 …）
export function levelOf(xp: number) {
  let level = 1;
  while (30 * level * (level + 1) <= xp) level++;
  const floor = 30 * (level - 1) * level;
  const next = 30 * level * (level + 1);
  return { level, floor, next, progress: (xp - floor) / (next - floor) };
}

const TITLES = ["見習い冒険者", "駆け出しの冒険者", "一人前の冒険者", "熟練の冒険者", "ギルドの英雄", "伝説の賢者"];
export function titleOf(level: number) {
  return TITLES[Math.min(level, TITLES.length) - 1];
}

export type Badge = { key: string; name: string; desc: string; rune: string };

const BADGES: (Badge & { test: (c: Counts) => boolean })[] = [
  { key: "first-quest", name: "はじまりの依頼", desc: "はじめてクエストを出した", rune: "Ⅰ", test: (c) => c.problems >= 1 },
  { key: "first-scroll", name: "攻略者", desc: "はじめて解決策を共有した", rune: "Ⅱ", test: (c) => c.solutions >= 1 },
  { key: "bounty", name: "依頼達成", desc: "困りごとに解決策で答えた", rune: "Ⅲ", test: (c) => c.bounty > 0 },
  { key: "missionary", name: "伝道師", desc: "解決策が3チーム以上に横展開された", rune: "Ⅳ", test: (c) => c.given >= 3 },
  { key: "border", name: "越境者", desc: "よそのチームの解決策を取り入れた", rune: "Ⅴ", test: (c) => c.taken >= 1 },
  { key: "sage", name: "賢者の弟子", desc: "賢者と企画書をまとめた", rune: "Ⅵ", test: (c) => c.plans >= 1 },
  { key: "empathy", name: "共感の灯", desc: "「うちも」「使いたい」を5回押した", rune: "Ⅶ", test: (c) => c.reactionsGiven >= 5 },
];

export type Adventurer = {
  userId: number;
  name: string;
  teamId: number;
  teamName: string;
  teamCode: string;
  counts: Counts;
  xp: number;
  level: number;
  title: string;
  progress: number;
  next: number;
  badges: Badge[];
};

export function listAdventurers(): Adventurer[] {
  const rows = db.prepare(`
    SELECT u.id AS userId, u.name, u.team_id AS teamId, t.name AS teamName, t.code AS teamCode,
      (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id AND p.kind = 'problem')  AS problems,
      (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id AND p.kind = 'solution') AS solutions,
      (SELECT COALESCE(SUM(20 + 5 * (SELECT COUNT(*) FROM reactions r WHERE r.post_id = q.id AND r.type = 'metoo')), 0)
         FROM posts s JOIN posts q ON q.id = s.problem_id
         WHERE s.author_id = u.id AND q.author_id <> u.id) AS bounty,
      (SELECT COUNT(*) FROM adoptions a JOIN posts s ON s.id = a.solution_id WHERE s.author_id = u.id) AS given,
      (SELECT COUNT(*) FROM adoptions a WHERE a.user_id = u.id) AS taken,
      (SELECT COUNT(*) FROM forge_sessions f WHERE f.user_id = u.id AND f.plan IS NOT NULL) AS plans,
      (SELECT COUNT(*) FROM reactions r JOIN posts p ON p.id = r.post_id
         WHERE p.author_id = u.id AND r.user_id <> u.id) AS reactionsReceived,
      (SELECT COUNT(*) FROM reactions r WHERE r.user_id = u.id) AS reactionsGiven,
      (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id) AS comments
    FROM users u JOIN teams t ON t.id = u.team_id`).all() as (Counts & {
    userId: number; name: string; teamId: number; teamName: string; teamCode: string;
  })[];

  return rows
    .map(({ userId, name, teamId, teamName, teamCode, ...c }) => {
      const xp = XP_RULES.reduce((s, r) => s + (r.key === "bounty" ? c.bounty : c[r.key] * r.xp), 0);
      const lv = levelOf(xp);
      return {
        userId, name, teamId, teamName, teamCode, counts: c, xp,
        level: lv.level, title: titleOf(lv.level), progress: lv.progress, next: lv.next,
        badges: BADGES.filter((b) => b.test(c)).map(publicBadge),
      };
    })
    .sort((a, b) => b.xp - a.xp);
}

export function getAdventurer(userId: number) {
  return listAdventurers().find((a) => a.userId === userId);
}

// 判定の関数は画面に渡さない（クライアントへ送れないため）
function publicBadge({ key, name, desc, rune }: Badge): Badge {
  return { key, name, desc, rune };
}

export const ALL_BADGES: Badge[] = BADGES.map(publicBadge);

export type Guild = { teamId: number; teamName: string; teamCode: string; xp: number; members: number; topName: string };

export function listGuilds(): Guild[] {
  const map = new Map<number, Guild>();
  for (const a of listAdventurers()) {
    const g = map.get(a.teamId) ?? { teamId: a.teamId, teamName: a.teamName, teamCode: a.teamCode, xp: 0, members: 0, topName: a.name };
    g.xp += a.xp;
    g.members += 1;
    map.set(a.teamId, g);
  }
  return [...map.values()].sort((a, b) => b.xp - a.xp);
}
