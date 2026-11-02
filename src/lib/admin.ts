import { db } from "./db";
import { listPosts } from "./data";
import { TOOLS, CATEGORIES, HOURLY_COST } from "./constants";

// 司令室（管理者ダッシュボード）の数字

export type WeekBucket = { label: string; problems: number; solutions: number };

// 直近8週の投稿数（週ごと・種類ごと）
export function weeklyPosts(weeks = 8): WeekBucket[] {
  const rows = db.prepare(`
    SELECT kind, CAST((julianday('now') - julianday(created_at)) / 7 AS INTEGER) AS ago
    FROM posts WHERE julianday('now') - julianday(created_at) < ?`).all(weeks * 7) as { kind: string; ago: number }[];
  return Array.from({ length: weeks }, (_, i) => {
    const ago = weeks - 1 - i;
    const d = new Date(Date.now() - ago * 7 * 864e5);
    return {
      label: ago === 0 ? "今週" : `${d.getMonth() + 1}/${d.getDate()}`,
      problems: rows.filter((r) => r.ago === ago && r.kind === "problem").length,
      solutions: rows.filter((r) => r.ago === ago && r.kind === "solution").length,
    };
  });
}

export type Funnel = { label: string; en: string; value: number; note: string }[];

// 悩みが成果になるまで：賢者との対話 → 企画書 → 挑戦を共有 → 成功 → 横展開
export function forgeFunnel(): Funnel {
  const r = db.prepare(`
    SELECT COUNT(*) AS sessions,
      SUM(plan IS NOT NULL) AS planned,
      SUM(solution_post_id IS NOT NULL) AS shared,
      (SELECT COUNT(*) FROM posts s
         WHERE s.stage = 'success' AND s.id IN (SELECT solution_post_id FROM forge_sessions)) AS succeeded,
      (SELECT COUNT(DISTINCT a.solution_id) FROM adoptions a
         WHERE a.solution_id IN (SELECT solution_post_id FROM forge_sessions)) AS adopted
    FROM forge_sessions`).get() as Record<string, number | null>;
  return [
    { label: "賢者と対話した", en: "DIALOGUES", value: r.sessions ?? 0, note: "悩みから壁打ちを始めた数" },
    { label: "企画書にまとめた", en: "PLANS", value: r.planned ?? 0, note: "あるべき姿〜解決策まで整理できた数" },
    { label: "挑戦として共有した", en: "CHALLENGES", value: r.shared ?? 0, note: "投稿として公開した数" },
    { label: "成功事例になった", en: "SUCCESSES", value: r.succeeded ?? 0, note: "挑戦が成功した数" },
    { label: "横展開された", en: "ADOPTED", value: r.adopted ?? 0, note: "よそのチームが取り入れた数" },
  ];
}

// 困りごと全体の流れ：困りごと → 挑戦が始まった → 成功した → 横展開された
export function problemFunnel(): Funnel {
  const r = db.prepare(`
    SELECT COUNT(*) AS problems,
      SUM(EXISTS (SELECT 1 FROM posts s WHERE s.problem_id = p.id AND s.stage <> 'lesson')) AS challenged,
      SUM(EXISTS (SELECT 1 FROM posts s WHERE s.problem_id = p.id AND s.stage = 'success')) AS solved,
      SUM(EXISTS (SELECT 1 FROM posts s JOIN adoptions a ON a.solution_id = s.id WHERE s.problem_id = p.id)) AS spread
    FROM posts p WHERE p.kind = 'problem'`).get() as Record<string, number | null>;
  return [
    { label: "困りごと", en: "PROBLEMS", value: r.problems ?? 0, note: "" },
    { label: "挑戦が始まった", en: "CHALLENGED", value: r.challenged ?? 0, note: "" },
    { label: "成功した", en: "SOLVED", value: r.solved ?? 0, note: "" },
    { label: "その成功が横展開された", en: "SPREAD", value: r.spread ?? 0, note: "" },
  ];
}

export type CategoryRow = { category: string; problems: number; open: number; challenges: number; successes: number; hours: number };

export function byCategory(): CategoryRow[] {
  const posts = listPosts();
  return CATEGORIES.map((category) => {
    const ps = posts.filter((p) => p.category === category);
    return {
      category,
      problems: ps.filter((p) => p.kind === "problem").length,
      open: ps.filter((p) => p.kind === "problem" && p.solutions === 0).length,
      challenges: ps.filter((p) => p.stage === "challenge").length,
      successes: ps.filter((p) => p.stage === "success").length,
      // 挑戦も解決策もまだ無い困りごとの、手作業の時間（月）
      hours: ps.filter((p) => p.kind === "problem" && p.solutions === 0).reduce((s, p) => s + (p.hours ?? 0), 0),
    };
  }).filter((r) => r.problems + r.challenges + r.successes > 0);
}

// 挑戦中と成功事例で使われているツール（学びは数えない）
export function toolUsage() {
  const solutions = listPosts({ kind: "solution" }).filter((p) => p.stage !== "lesson");
  return TOOLS.map((tool) => {
    const used = solutions.filter((s) => s.tools.includes(tool));
    return { tool, solutions: used.length, adoptions: used.reduce((s, p) => s + p.adoptions, 0) };
  })
    .filter((t) => t.solutions > 0)
    .sort((a, b) => b.solutions + b.adoptions - (a.solutions + a.adoptions));
}

// 優先して取り組むべきクエスト：解決策が無く、手作業が大きく、共感が多いもの
export function priorityQuests(limit = 5) {
  return listPosts({ open: true })
    .map((p) => ({ post: p, score: (p.hours ?? 0) * (1 + p.metoo) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function adminKpis() {
  const posts = listPosts();
  const problems = posts.filter((p) => p.kind === "problem");
  const successes = posts.filter((p) => p.stage === "success");
  // 減った時間は、成功事例だけ（挑戦中の時間は、まだ見込み）
  const savedHours = successes.reduce((s, p) => s + (p.hours ?? 0) * (1 + p.adoptions), 0);
  const solved = new Set(successes.map((p) => p.problemId).filter((x): x is number => x !== null));
  const { active } = db.prepare(`
    SELECT COUNT(DISTINCT uid) AS active FROM (
      SELECT author_id AS uid FROM posts WHERE created_at > datetime('now', '-30 days')
      UNION SELECT user_id FROM reactions WHERE created_at > datetime('now', '-30 days')
      UNION SELECT user_id FROM adoptions WHERE created_at > datetime('now', '-30 days')
      UNION SELECT user_id FROM comments WHERE created_at > datetime('now', '-30 days')
      UNION SELECT user_id FROM forge_sessions WHERE updated_at > datetime('now', '-30 days'))`).get() as { active: number };
  const { users } = db.prepare("SELECT COUNT(*) AS users FROM users").get() as { users: number };
  return {
    problems: problems.length,
    solvedRate: problems.length ? problems.filter((p) => solved.has(p.id)).length / problems.length : 0,
    challenges: posts.filter((p) => p.stage === "challenge").length,
    successes: successes.length,
    lessons: posts.filter((p) => p.stage === "lesson").length,
    adoptions: successes.reduce((s, p) => s + p.adoptions, 0),
    savedHours,
    savedYenPerYear: savedHours * 12 * HOURLY_COST,
    openHours: problems.filter((p) => p.solutions === 0).reduce((s, p) => s + (p.hours ?? 0), 0),
    active,
    users,
  };
}
