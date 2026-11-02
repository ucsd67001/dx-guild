import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { seed } from "./seed";

// ローカルでは data/dx-guild.db に置く（git には入れない）。
// 消せば、次に開いたときに見本データで作り直される（npm run db:reset）。
const DB_PATH = path.join(process.cwd(), "data", "dx-guild.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS teams (
  id      INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,
  code    TEXT NOT NULL,          -- 画面の略号（HD・INF など）
  mission TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS users (
  id      INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  role    TEXT NOT NULL DEFAULT ''
);

-- 困りごと（problem）と解決策（solution）を一つの表に持つ
CREATE TABLE IF NOT EXISTS posts (
  id         INTEGER PRIMARY KEY,
  kind       TEXT NOT NULL CHECK (kind IN ('problem', 'solution')),
  title      TEXT NOT NULL,
  summary    TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  category   TEXT NOT NULL,
  tools      TEXT NOT NULL DEFAULT '[]',   -- JSON の配列
  tags       TEXT NOT NULL DEFAULT '[]',   -- JSON の配列
  hours      REAL,                         -- 困りごと＝手作業にかかる時間／月、解決策＝減った時間／月
  stage      TEXT CHECK (stage IN ('idea', 'pilot', 'live')),  -- 解決策だけ
  problem_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,  -- 解決策が答えている困りごと
  author_id  INTEGER NOT NULL REFERENCES users(id),
  team_id    INTEGER NOT NULL REFERENCES teams(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- metoo＝うちも困っている（困りごと）、want＝うちでも使いたい（解決策）
CREATE TABLE IF NOT EXISTS reactions (
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  type       TEXT NOT NULL CHECK (type IN ('metoo', 'want')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (post_id, user_id, type)
);

-- 横展開＝ほかのチームが、その解決策を自分のところに入れた記録。チームごとに一つ
CREATE TABLE IF NOT EXISTS adoptions (
  id          INTEGER PRIMARY KEY,
  solution_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  team_id     INTEGER NOT NULL REFERENCES teams(id),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (solution_id, team_id)
);

-- 賢者の工房：AI との壁打ち。悩み → 対話 → 企画書（plan）→ 共有（投稿）
CREATE TABLE IF NOT EXISTS forge_sessions (
  id               INTEGER PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  team_id          INTEGER NOT NULL REFERENCES teams(id),
  worry            TEXT NOT NULL,                -- 最初のひとこと（悩み・不満）
  messages         TEXT NOT NULL DEFAULT '[]',   -- JSON [{ role: 'user' | 'assistant', content }]
  plan             TEXT,                         -- JSON。企画書にまとめたら入る
  demo             INTEGER NOT NULL DEFAULT 0,   -- 1＝AI につながず、デモの応答で作った
  problem_post_id  INTEGER REFERENCES posts(id) ON DELETE SET NULL,
  solution_post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function open() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  // ⚠️ WAL にしない。OneDrive の中に置くので、-wal / -shm の付属ファイルを増やさない
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM teams").get() as { n: number };
  if (n === 0) seed(db);
  return db;
}

// 開発サーバーは書き換えのたびにこのファイルを読み直すので、接続は一つを使い回す
declare global {
  var __dxGuildDb: Database.Database | undefined;
}

export const db: Database.Database = globalThis.__dxGuildDb ?? (globalThis.__dxGuildDb = open());
