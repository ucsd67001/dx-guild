@AGENTS.md

# DXギルド ― スレッドの申し送り

IT Div. の困りごとと解決策を共有し、AI の賢者と企画し、横展開するためのギルド（ローカルの試作）。
**中身・動かし方・作りは `README.md`。**ここには、知らずに触ると壊すことだけを書く。
（名前は v0.1 が Yokoten、v0.2 が QuestForge、v0.3 から DXギルド。名前は `src/lib/constants.ts` の `PRODUCT` から画面と AI の指示に渡る。フォルダ名は 2026-11-02 に `yokoten` から `dx-guild` に変えた）
- ⚠️ **フォルダ名を変えるときは、開発サーバーを止め、Claude のセッションもそのフォルダの外に出てから。**中で動いているあいだは Windows がフォルダを掴んでいて、名前を変えられない

- ⚠️ **報告は日本語で。**このリポジトリの持ち主はバイブコーディング。専門用語には言い換えを添え、選択肢はおすすめと理由をつけて本文に書く
- ⚠️ **Next.js 16。**`params` と `searchParams` と `cookies()` は Promise（`await` する）。書く前に `node_modules/next/dist/docs/` を見る
- ⚠️ **`cacheComponents` を入れない。**create-next-app の既定では入るが、DB を同期で読むこのアプリでは古い中身を事前生成に焼き付ける。`next.config.ts` から外してある
- **書き込みは `src/lib/actions.ts` だけ**（AI の返事の保存は `src/app/api/` から `forge.ts` を呼ぶ）。画面を通さず直接呼べるので、値は必ずそこで確かめ直す。書いたら `revalidatePath("/", "layout")`
- **DB は OneDrive の中**（`data/dx-guild.db`）。WAL にしない（付属ファイルが同期で揉める）。開発サーバーが動いているあいだは `db:reset` で消せない（Windows がファイルを掴んでいる）。⚠️ 表や見本データを変えたら、サーバーを止めて `db:reset` してから起動し直す（接続を使い回しているため）
- **見本データのチームと人は、すべて架空。**実在の人・チームの名前を入れない
- ⚠️ **API キー（`.env.local`）を読まない・表示しない・git に上げない。**入れるのは持ち主。鍵が無いと賢者は「デモ」で動く（デモであることを画面に必ず出す）
- **AI の呼び出しは `src/lib/ai.ts` だけ。**持ち主の指定で、**GEMu_Web と同じ OpenAI の API**（`chat.completions`・既定 `gpt-4.1-mini`・鍵は `OPENAI_API_KEY`）を使う。Claude に戻さない。**効果の数字は AI に計算させない**（前提だけを受け取り、`calcEffect` が計算する）
- 決まった形の答えは、zod の形を `z.toJSONSchema` で strict な JSON Schema にして渡し、返ってきたものを zod で確かめ直す（`askStructured`）。`gpt-4.1-mini` に `reasoning_effort` を渡すと断られる（考えるモデルに替えたときだけ `DXG_REASONING_EFFORT` を入れる）。`openai` は 7.38.0 に固定
- **経験値は記録から数え直す**（`game.ts`）。XP の表を作らない
- 見た目の考え方は `src/app/globals.css` の頭。色は `:root` の変数だけを使う。グラフの青緑（`--teal`）と緑は、色の見分けを確かめた値。変えるなら確かめ直す
- 持ち主に渡すコマンドは **PowerShell 5.1** で動く形（`&&` を使わない）
- 直したら `npm run typecheck` と `npm run lint`。画面はブラウザで開いて確かめる（スマホの幅でも、横にはみ出さないか）
- ⚠️ 参考にした前職の資料（DX-STANDARD）からは、**考え方だけ**を借りている。文や図をそのまま写さない
