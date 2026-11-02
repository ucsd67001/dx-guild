"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getCurrentUser, getPost, USER_COOKIE } from "./data";
import { CATEGORIES, REACTION_OF, STAGES, TOOLS, calcEffect } from "./constants";
import { getForgeSession } from "./forge";
import { toEffort } from "./ai";

// ⚠️ どの関数も、画面を通さず直接呼べる。値はすべてここで確かめ直す

function text(form: FormData, key: string, max: number) {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

// 「月◯時間」の入力。0 より大きい数だけを、小数1けたに丸めて受け取る
function hoursOf(form: FormData) {
  const raw = Number(form.get("hours"));
  return Number.isFinite(raw) && raw > 0 ? Math.min(Math.round(raw * 10) / 10, 9999) : null;
}

function id(form: FormData, key: string) {
  const n = Number(form.get(key));
  return Number.isInteger(n) && n > 0 ? n : null;
}

// 「Python, 自動化、Teams」のような書き方を、重なりなしの配列にする
function words(raw: string, max: number) {
  return [...new Set(raw.split(/[,、，\s]+/).map((w) => w.trim()).filter(Boolean))]
    .map((w) => w.slice(0, 30))
    .slice(0, max);
}

export async function switchUser(form: FormData) {
  const uid = id(form, "uid");
  if (!uid) return;
  const jar = await cookies();
  jar.set(USER_COOKIE, String(uid), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

export async function createPost(form: FormData) {
  const me = await getCurrentUser();
  const kind = form.get("kind") === "solution" ? "solution" : "problem";
  const title = text(form, "title", 100);
  const summary = text(form, "summary", 240);
  if (!title || !summary) throw new Error("題と、ひとことの説明は必ず書いてください");

  const category = (CATEGORIES as readonly string[]).includes(String(form.get("category")))
    ? String(form.get("category"))
    : "その他";
  const picked = form.getAll("tools").map(String).filter((t) => (TOOLS as readonly string[]).includes(t));
  const tools = [...new Set([...picked, ...words(text(form, "toolsOther", 200), 6)])].slice(0, 12);
  const tags = words(text(form, "tags", 200), 8);

  const hours = hoursOf(form);

  let stage: string | null = null;
  let problemId: number | null = null;
  if (kind === "solution") {
    const s = String(form.get("stage"));
    stage = s in STAGES ? s : "challenge";
    const pid = id(form, "problemId");
    if (pid && getPost(pid)?.kind === "problem") problemId = pid;
  }

  const result = db.prepare(`
    INSERT INTO posts (kind, title, summary, body, category, tools, tags, hours, stage, problem_id, author_id, team_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    kind, title, summary, text(form, "body", 8000), category,
    JSON.stringify(tools), JSON.stringify(tags), hours, stage, problemId, me.id, me.teamId,
  );

  revalidatePath("/", "layout");
  redirect(`/posts/${result.lastInsertRowid}`);
}

// うちも困っている／一緒にやりたい／うちでも使いたい・参考になった（押すたびに付け外し）
export async function toggleReaction(form: FormData) {
  const me = await getCurrentUser();
  const postId = id(form, "postId");
  const post = postId ? getPost(postId) : undefined;
  if (!post) return;
  const type = post.kind === "problem" ? "metoo" : REACTION_OF[post.stage ?? "challenge"];
  // 自分の挑戦に「一緒にやりたい」は押せない
  if (type === "join" && post.authorId === me.id) return;

  const removed = db.prepare("DELETE FROM reactions WHERE post_id = ? AND user_id = ? AND type = ?")
    .run(post.id, me.id, type);
  if (removed.changes === 0) {
    db.prepare("INSERT INTO reactions (post_id, user_id, type) VALUES (?, ?, ?)").run(post.id, me.id, type);
  }
  revalidatePath("/", "layout");
}

// 横展開した＝自分のチームにこの解決策を入れた
export async function adoptSolution(form: FormData) {
  const me = await getCurrentUser();
  const postId = id(form, "postId");
  const post = postId ? getPost(postId) : undefined;
  // 横展開できるのは成功事例だけ。自分のチームの解決策は、横展開に数えない
  if (!post || post.stage !== "success" || post.teamId === me.teamId) return;

  db.prepare(`
    INSERT INTO adoptions (solution_id, team_id, user_id, note) VALUES (?, ?, ?, ?)
    ON CONFLICT (solution_id, team_id) DO NOTHING`).run(post.id, me.teamId, me.id, text(form, "note", 200));
  revalidatePath("/", "layout");
}

export async function withdrawAdoption(form: FormData) {
  const me = await getCurrentUser();
  const postId = id(form, "postId");
  if (!postId) return;
  db.prepare("DELETE FROM adoptions WHERE solution_id = ? AND team_id = ?").run(postId, me.teamId);
  revalidatePath("/", "layout");
}

// 挑戦の結果を報告する（挑戦した本人だけ）。
// 成功 → 成功事例（実際に減った時間に置き換える）／うまくいかなかった → 学びとして残す
export async function reportResult(form: FormData) {
  const me = await getCurrentUser();
  const postId = id(form, "postId");
  const post = postId ? getPost(postId) : undefined;
  if (!post || post.stage !== "challenge" || post.authorId !== me.id) return;

  const outcome = form.get("outcome") === "success" ? "success" : "lesson";
  const note = text(form, "note", 2000);
  // 学びは、次に試す人のための一言が要る（画面でも必須にしている）
  if (outcome === "lesson" && !note) return;

  const heading = outcome === "success" ? "■ 結果（成功）" : "■ 学んだこと（次に試す人へ）";
  const day = new Date().toLocaleDateString("ja-JP");
  const body = note ? `${post.body}\n\n${heading}　${day}\n${note}`.slice(0, 8000) : post.body;
  const hours = outcome === "success" ? (hoursOf(form) ?? post.hours) : post.hours;

  db.prepare("UPDATE posts SET stage = ?, body = ?, hours = ? WHERE id = ?").run(outcome, body, hours, post.id);
  revalidatePath("/", "layout");
}

export async function addComment(form: FormData) {
  const me = await getCurrentUser();
  const postId = id(form, "postId");
  const body = text(form, "body", 2000);
  if (!postId || !body || !getPost(postId)) return;
  db.prepare("INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)").run(postId, me.id, body);
  revalidatePath(`/posts/${postId}`);
}

// ── 賢者の工房 ─────────────────────────────

// 悩みのひとことから、壁打ちを始める
export async function startForge(form: FormData) {
  const me = await getCurrentUser();
  const worry = text(form, "worry", 400);
  if (!worry) return;
  const r = db.prepare("INSERT INTO forge_sessions (user_id, team_id, worry) VALUES (?, ?, ?)").run(me.id, me.teamId, worry);
  redirect(`/forge/${r.lastInsertRowid}`);
}

// 企画書を、困りごと（クエスト）と解決策（挑戦中）の二つの投稿にして共有する
export async function shareForge(form: FormData) {
  const me = await getCurrentUser();
  const sid = id(form, "sessionId");
  const s = sid ? getForgeSession(sid) : undefined;
  if (!s || !s.plan || s.userId !== me.id || s.solutionPostId) return;

  const plan = s.plan;
  const pick = plan.solutions[plan.recommended_index] ?? plan.solutions[0];
  const effect = calcEffect(toEffort(pick.estimate));
  const category = (CATEGORIES as readonly string[]).includes(plan.category) ? plan.category : "その他";
  const tags = JSON.stringify(plan.tags.slice(0, 8));
  const insert = db.prepare(`
    INSERT INTO posts (kind, title, summary, body, category, tools, tags, hours, stage, problem_id, author_id, team_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const problemBody = [
    `■ あるべき姿\n${plan.to_be}`,
    `■ 現状\n${plan.as_is}`,
    `■ 問題\n${plan.problem}`,
    `■ 課題\n${plan.issues.map((i) => `・${i}`).join("\n")}`,
    "（賢者の工房で整理しました）",
  ].join("\n\n");

  const solutionBody = [
    `■ やること\n${pick.approach}`,
    `■ ステップ\n${pick.steps.map((st, i) => `${i + 1}. ${st.title}（${st.duration}）：${st.detail}`).join("\n")}`,
    `■ 効果の見込み\n月 ${effect.currentHours} 時間 → ${effect.savedHours} 時間の削減（${pick.estimate.assumptions}）`,
    `■ 効果 → 成果 → インパクト\n効果：${pick.impact_path.output}\n成果：${pick.impact_path.outcome}\nインパクト：${pick.impact_path.impact}`,
    `■ 気をつけること\n${pick.risks.map((r) => `・${r}`).join("\n")}`,
    `■ 最初の一歩\n${plan.first_step}`,
    "（賢者の工房でまとめて、挑戦を始めました。一緒にやりたい人を募集しています）",
  ].join("\n\n");

  const ids = db.transaction(() => {
    const p = insert.run(
      "problem", s.worry.slice(0, 100), plan.problem.slice(0, 240), problemBody, category, "[]", tags,
      effect.currentHours || null, null, null, me.id, me.teamId,
    ).lastInsertRowid as number;
    const sol = insert.run(
      "solution", `${pick.name}：${plan.title}`.slice(0, 100), pick.summary.slice(0, 240), solutionBody, category,
      JSON.stringify(pick.tools.slice(0, 12)), tags, effect.savedHours || null, "challenge", p, me.id, me.teamId,
    ).lastInsertRowid as number;
    db.prepare("UPDATE forge_sessions SET problem_post_id = ?, solution_post_id = ?, updated_at = datetime('now') WHERE id = ?")
      .run(p, sol, s.id);
    return { sol };
  })();

  revalidatePath("/", "layout");
  redirect(`/posts/${ids.sol}`);
}
