@AGENTS.md

# Yokoten ― スレッドの申し送り

IT Div. の困りごとと解決策を共有し、横展開するためのコミュニティ（ローカルの試作）。
**中身・動かし方・作りは `README.md`。**ここには、知らずに触ると壊すことだけを書く。

- ⚠️ **報告は日本語で。**このリポジトリの持ち主はバイブコーディング。専門用語には言い換えを添え、選択肢はおすすめと理由をつけて本文に書く
- ⚠️ **Next.js 16。**`params` と `searchParams` と `cookies()` は Promise（`await` する）。書く前に `node_modules/next/dist/docs/` を見る
- ⚠️ **`cacheComponents` を入れない。**create-next-app の既定では入るが、DB を同期で読むこのアプリでは古い中身を事前生成に焼き付ける。`next.config.ts` から外してある
- **書き込みは `src/lib/actions.ts` だけ。**画面を通さず直接呼べるので、値は必ずそこで確かめ直す。書いたら `revalidatePath("/", "layout")`
- **DB は OneDrive の中**（`data/yokoten.db`）。WAL にしない（付属ファイルが同期で揉める）。開発サーバーが動いているあいだは `db:reset` で消せない（Windows がファイルを掴んでいる）
- **見本データのチームと人は、すべて架空。**実在の人・チームの名前を入れない
- 見た目の考え方は `src/app/globals.css` の頭。色は `:root` の変数だけを使う
- 持ち主に渡すコマンドは **PowerShell 5.1** で動く形（`&&` を使わない）
- 直したら `npm run typecheck` と `npm run lint`。画面はブラウザで開いて確かめる
