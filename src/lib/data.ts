import { cookies } from "next/headers";
import { db } from "./db";
import type { Kind, ReactionType, Stage } from "./constants";

// ── 型 ─────────────────────────────────────

export type Team = { id: number; name: string; code: string; mission: string };
export type User = { id: number; name: string; teamId: number; teamName: string; teamCode: string; role: string };

export type Post = {
  id: number;
  kind: Kind;
  title: string;
  summary: string;
  body: string;
  category: string;
  tools: string[];
  tags: string[];
  hours: number | null;
  stage: Stage | null;
  problemId: number | null;
  authorId: number;
  authorName: string;
  teamId: number;
  teamName: string;
  teamCode: string;
  createdAt: string;
  metoo: number;      // うちも困っている
  want: number;       // うちでも使いたい（成功事例）・参考になった（学び）
  join: number;       // 一緒にやりたい（挑戦中）
  adoptions: number;  // 横展開したチームの数
  comments: number;
  solutions: number;  // この困りごとに挑戦している・解決した解決策の数（学びは数えない）
};

type PostRow = Omit<Post, "tools" | "tags"> & { tools: string; tags: string };

const POST_SELECT = `
  SELECT p.id, p.kind, p.title, p.summary, p.body, p.category, p.tools, p.tags, p.hours, p.stage,
         p.problem_id AS problemId, p.author_id AS authorId, u.name AS authorName,
         p.team_id AS teamId, t.name AS teamName, t.code AS teamCode, p.created_at AS createdAt,
         (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = 'metoo') AS metoo,
         (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = 'want')  AS want,
         (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = 'join')  AS "join",
         (SELECT COUNT(*) FROM adoptions a WHERE a.solution_id = p.id)                AS adoptions,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)                     AS comments,
         (SELECT COUNT(*) FROM posts s WHERE s.problem_id = p.id AND s.stage <> 'lesson') AS solutions
  FROM posts p
  JOIN users u ON u.id = p.author_id
  JOIN teams t ON t.id = p.team_id`;

function toPost(r: PostRow): Post {
  return { ...r, tools: JSON.parse(r.tools), tags: JSON.parse(r.tags) };
}

// ── 人とチーム ───────────────────────────────

const USER_SELECT = `
  SELECT u.id, u.name, u.team_id AS teamId, t.name AS teamName, t.code AS teamCode, u.role
  FROM users u JOIN teams t ON t.id = u.team_id`;

export function listUsers(): User[] {
  return db.prepare(`${USER_SELECT} ORDER BY u.team_id, u.id`).all() as User[];
}

export function listTeams(): Team[] {
  return db.prepare("SELECT * FROM teams ORDER BY id").all() as Team[];
}

export const USER_COOKIE = "dg_uid";

// ⚠️ ログインはまだ無い。画面の右上で「だれとして使うか」を選び、クッキーに持つだけ。
//    社内に出すときは、ここを Entra ID などのログインに替える
export async function getCurrentUser(): Promise<User> {
  const jar = await cookies();
  const id = Number(jar.get(USER_COOKIE)?.value);
  const user = Number.isInteger(id)
    ? (db.prepare(`${USER_SELECT} WHERE u.id = ?`).get(id) as User | undefined)
    : undefined;
  return user ?? (db.prepare(`${USER_SELECT} ORDER BY u.id LIMIT 1`).get() as User);
}

// ── 投稿 ───────────────────────────────────

// 困りごとに、挑戦中か成功した解決策がまだ無い（学びだけなら、まだ挑戦者を待っている）
const NO_ANSWER = "NOT EXISTS (SELECT 1 FROM posts s WHERE s.problem_id = p.id AND s.stage <> 'lesson')";

export type PostFilter = {
  q?: string;
  kind?: Kind;
  stage?: Stage;
  category?: string;
  tool?: string;
  team?: number;
  author?: number;
  sort?: "new" | "popular" | "impact";
  open?: boolean; // 挑戦も解決策もまだ無い困りごとだけ（学びだけのものは含む）
  limit?: number;
};

export function listPosts(f: PostFilter = {}): Post[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (f.kind) { where.push("p.kind = ?"); args.push(f.kind); }
  if (f.stage) { where.push("p.stage = ?"); args.push(f.stage); }
  if (f.category) { where.push("p.category = ?"); args.push(f.category); }
  if (f.team) { where.push("p.team_id = ?"); args.push(f.team); }
  if (f.author) { where.push("p.author_id = ?"); args.push(f.author); }
  if (f.tool) { where.push("EXISTS (SELECT 1 FROM json_each(p.tools) WHERE value = ?)"); args.push(f.tool); }
  if (f.open) where.push(`p.kind = 'problem' AND ${NO_ANSWER}`);
  if (f.q) {
    for (const word of f.q.split(/\s+/).filter(Boolean)) {
      where.push("(p.title LIKE ? OR p.summary LIKE ? OR p.body LIKE ? OR p.tags LIKE ? OR p.tools LIKE ?)");
      const like = `%${word}%`;
      args.push(like, like, like, like, like);
    }
  }
  const order = {
    new: "p.created_at DESC",
    popular: "(metoo + want + \"join\" + adoptions * 2) DESC, p.created_at DESC",
    impact: "COALESCE(p.hours, 0) * (1 + adoptions) DESC, p.created_at DESC",
  }[f.sort ?? "new"];

  const sql = `${POST_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
               ORDER BY ${order} ${f.limit ? `LIMIT ${Math.floor(f.limit)}` : ""}`;
  return (db.prepare(sql).all(...args) as PostRow[]).map(toPost);
}

export function getPost(id: number): Post | undefined {
  const r = db.prepare(`${POST_SELECT} WHERE p.id = ?`).get(id) as PostRow | undefined;
  return r && toPost(r);
}

export function listSolutionsFor(problemId: number): Post[] {
  return (db.prepare(`${POST_SELECT} WHERE p.problem_id = ? ORDER BY p.created_at`).all(problemId) as PostRow[]).map(toPost);
}

// 似ている投稿。タグ・ツール・分類が重なるものを、ほかのチームの投稿から拾う。
// ここが「よそのチームが、もう同じことをやっていた」に気づく入口になる
export function listRelated(post: Post, limit = 4): Post[] {
  const others = listPosts().filter(
    (p) => p.id !== post.id && p.problemId !== post.id && p.id !== post.problemId,
  );
  return others
    .map((p) => {
      const tags = p.tags.filter((t) => post.tags.includes(t)).length;
      const tools = p.tools.filter((t) => post.tools.includes(t)).length;
      const score = tags * 3 + tools + (p.category === post.category ? 2 : 0)
        + (p.kind !== post.kind ? 1 : 0) + (p.teamId !== post.teamId ? 1 : 0);
      return { p, score, overlap: tags + tools };
    })
    .filter((x) => x.overlap > 0 || x.p.category === post.category)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

// ── リアクション・横展開・コメント ─────────────────

export type ReactingTeam = { teamId: number; teamName: string; teamCode: string; people: number };

export function listReactingTeams(postId: number, type: ReactionType): ReactingTeam[] {
  return db.prepare(`
    SELECT t.id AS teamId, t.name AS teamName, t.code AS teamCode, COUNT(*) AS people
    FROM reactions r JOIN users u ON u.id = r.user_id JOIN teams t ON t.id = u.team_id
    WHERE r.post_id = ? AND r.type = ?
    GROUP BY t.id ORDER BY people DESC, t.id`).all(postId, type) as ReactingTeam[];
}

export function hasReacted(postId: number, userId: number, type: ReactionType) {
  return !!db.prepare("SELECT 1 FROM reactions WHERE post_id = ? AND user_id = ? AND type = ?").get(postId, userId, type);
}

export type Adoption = {
  id: number; teamId: number; teamName: string; teamCode: string;
  userId: number; userName: string; note: string; createdAt: string;
};

export function listAdoptions(solutionId: number): Adoption[] {
  return db.prepare(`
    SELECT a.id, a.team_id AS teamId, t.name AS teamName, t.code AS teamCode,
           a.user_id AS userId, u.name AS userName, a.note, a.created_at AS createdAt
    FROM adoptions a JOIN teams t ON t.id = a.team_id JOIN users u ON u.id = a.user_id
    WHERE a.solution_id = ? ORDER BY a.created_at`).all(solutionId) as Adoption[];
}

export type Comment = { id: number; userId: number; userName: string; teamCode: string; body: string; createdAt: string };

export function listComments(postId: number): Comment[] {
  return db.prepare(`
    SELECT c.id, c.user_id AS userId, u.name AS userName, t.code AS teamCode, c.body, c.created_at AS createdAt
    FROM comments c JOIN users u ON u.id = c.user_id JOIN teams t ON t.id = u.team_id
    WHERE c.post_id = ? ORDER BY c.created_at, c.id`).all(postId) as Comment[];
}

// ── 数字 ───────────────────────────────────

export type Stats = {
  problems: number;
  challenges: number;
  successes: number;
  lessons: number;
  openProblems: number;
  adoptions: number;
  teamsSharing: number;
  hoursSaved: number; // 成功事例の「減った時間／月」×（作ったチーム＋横展開したチーム）
};

export function getStats(): Stats {
  return db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM posts WHERE kind = 'problem')  AS problems,
      (SELECT COUNT(*) FROM posts WHERE stage = 'challenge') AS challenges,
      (SELECT COUNT(*) FROM posts WHERE stage = 'success')   AS successes,
      (SELECT COUNT(*) FROM posts WHERE stage = 'lesson')    AS lessons,
      (SELECT COUNT(*) FROM posts p WHERE kind = 'problem' AND ${NO_ANSWER}) AS openProblems,
      (SELECT COUNT(*) FROM adoptions) AS adoptions,
      (SELECT COUNT(DISTINCT team_id) FROM posts) AS teamsSharing,
      (SELECT COALESCE(SUM(p.hours * (1 + (SELECT COUNT(*) FROM adoptions a WHERE a.solution_id = p.id))), 0)
         FROM posts p WHERE p.stage = 'success') AS hoursSaved`).get() as Stats;
}
