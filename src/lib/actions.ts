"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getCurrentUser, getPost, USER_COOKIE } from "./data";
import { CATEGORIES, STAGES, TOOLS } from "./constants";

// ⚠️ どの関数も、画面を通さず直接呼べる。値はすべてここで確かめ直す

function text(form: FormData, key: string, max: number) {
  return String(form.get(key) ?? "").trim().slice(0, max);
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

  const hoursRaw = Number(form.get("hours"));
  const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? Math.min(Math.round(hoursRaw * 10) / 10, 9999) : null;

  let stage: string | null = null;
  let problemId: number | null = null;
  if (kind === "solution") {
    const s = String(form.get("stage"));
    stage = s in STAGES ? s : "idea";
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

// うちも困っている／うちでも使いたい（押すたびに付け外し）
export async function toggleReaction(form: FormData) {
  const me = await getCurrentUser();
  const postId = id(form, "postId");
  const post = postId ? getPost(postId) : undefined;
  if (!post) return;
  const type = post.kind === "problem" ? "metoo" : "want";

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
  // 自分のチームの解決策は、横展開に数えない
  if (!post || post.kind !== "solution" || post.teamId === me.teamId) return;

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

export async function addComment(form: FormData) {
  const me = await getCurrentUser();
  const postId = id(form, "postId");
  const body = text(form, "body", 2000);
  if (!postId || !body || !getPost(postId)) return;
  db.prepare("INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)").run(postId, me.id, body);
  revalidatePath(`/posts/${postId}`);
}
