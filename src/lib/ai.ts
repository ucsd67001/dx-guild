import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CATEGORIES, postCode, type EffortInput } from "./constants";
import type { Post } from "./data";

// ============================================================
// 賢者（AI）。Claude を使う。
// ・鍵は .env.local の ANTHROPIC_API_KEY。無いときは「デモの応答」で画面の流れだけを見せる
// ・断られたとき（refusal）は、別のモデルが続きを答える（fallbacks: "default"）
// ・数字の計算はさせない。前提（回数・分・人数・削減率）だけを出させ、計算は calcEffect で
// ============================================================

export const MODEL = process.env.QF_MODEL || "claude-opus-5-5";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export function aiConnected() {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | undefined;
function getClient() {
  return (client ??= new Anthropic());
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

// ── 企画書の形 ─────────────────────────────

const EstimateSchema = z.object({
  times_per_month: z.number().describe("その作業が月に何回あるか"),
  minutes_per_time: z.number().describe("1回あたり何分かかっているか"),
  people: z.number().describe("その作業をしている人数"),
  reduction_rate: z.number().describe("解決策で減らせる割合。0〜1（0.6 なら6割減）"),
  assumptions: z.string().describe("数字の前提。本人が言った数字か、推定かを書き分ける"),
});

const SolutionSchema = z.object({
  name: z.string().describe("解決策の名前（20字以内）"),
  summary: z.string().describe("どう解くか（80字程度）"),
  approach: z.string().describe("具体的な実現方法。仕組みの流れ（200字程度）"),
  tools: z.array(z.string()).describe("使うツール（Power Automate、Copilot Studio、Python など）"),
  steps: z
    .array(z.object({ title: z.string(), detail: z.string(), duration: z.string().describe("目安の期間（例：1週間）") }))
    .describe("実現までのステップ。3〜6個"),
  difficulty: z.enum(["易しい", "ふつう", "難しい"]),
  estimate: EstimateSchema,
  impact_path: z.object({
    output: z.string().describe("効果（アウトプット）：時間・件数など、直接変わること"),
    outcome: z.string().describe("成果（アウトカム）：効果から生まれる、業務や人の変化"),
    impact: z.string().describe("インパクト：コスト・品質・満足度など、組織にとっての意味"),
  }),
  risks: z.array(z.string()).describe("気をつけること。2〜3個"),
});

export const PlanSchema = z.object({
  title: z.string().describe("この企画の題（30字以内）"),
  to_be: z.string().describe("あるべき姿：本当はどうなっていてほしいか"),
  as_is: z.string().describe("現状：いま何が起きているか（だれが・どのくらい）"),
  problem: z.string().describe("問題：あるべき姿と現状のギャップ"),
  issues: z.array(z.string()).describe("課題：ギャップを埋めるために取り組むこと。2〜4個"),
  solutions: z.array(SolutionSchema).describe("解決策の案。2〜3個。手軽なものから順に"),
  recommended_index: z.number().int().describe("いちばんのおすすめ案の番号（0始まり）"),
  recommended_reason: z.string().describe("おすすめする理由"),
  related_case_ids: z.array(z.number().int()).describe("参考になる社内事例の番号（数字だけ）。一覧に無いものは入れない"),
  first_step: z.string().describe("明日からできる最初の一歩"),
  category: z.enum(CATEGORIES),
  tags: z.array(z.string()).describe("タグ。2〜5個"),
});

export type Plan = z.infer<typeof PlanSchema>;

export function toEffort(e: Plan["solutions"][number]["estimate"]): EffortInput {
  return {
    timesPerMonth: e.times_per_month,
    minutesPerTime: e.minutes_per_time,
    people: e.people,
    reductionRate: e.reduction_rate,
  };
}

// ── 指示 ───────────────────────────────────

const SAGE_SYSTEM = `あなたは、IT 部門の社内コミュニティ「QuestForge」にいる「賢者」です。
社員の、ちょっとした業務上の悩みや不満を一緒に掘り下げ、本人が自分で解決策を思いつけるように手伝う、壁打ちの相手です。

進め方
- 一度に聞くのは1〜2問まで。短く、具体的に聞きます。
- はじめに状況を確かめます：だれが、どのくらいの頻度で、1回に何分、何人で。
- 次に「本当はどうなっていてほしいか（あるべき姿）」を聞きます。
- 本人の考えを先に聞き、そのあとでヒントを出します。答えを押しつけません。
- 下の「社内の事例」に使えそうなものがあれば、番号（SOL-0006 など）を挙げて紹介します。一覧に無い事例を作りません。
- 解決策は、IT 部門が手に取りやすいものから考えます：ノーコード・ローコード（Power Automate、Power Apps など）、生成 AI、AI エージェント、ちょっとしたスクリプト。
- 数字は本人が言ったものを使います。分からない数字は聞きます。
- 3〜4往復して材料がそろったら、画面の「企画書にまとめる」を押すよう勧めます。

書き方
- 日本語の、です・ます調。1回の返答は200字程度まで。
- 見出し・表・箇条書きの記号は使わず、ふつうの文で話します。`;

const PLAN_SYSTEM = `あなたは、IT 部門の社内コミュニティ「QuestForge」の「賢者」です。
社員との壁打ちの記録をもとに、悩みを「あるべき姿・現状・問題・課題・解決策」に整理した企画書を作ります。

- 記録に無い事実を作りません。足りない数字は、IT 部門でよくある値を推定し、推定であることを assumptions に書きます。
- 解決策は2〜3案。手軽なもの（ノーコード・ローコード）から、AI エージェントのような踏み込んだものへ。
- 各案のステップは、明日から動ける粒度で。期間の目安をつけます。
- 効果は「効果（アウトプット）→ 成果（アウトカム）→ インパクト」の流れで書きます。
- 金額の計算はしません。回数・分・人数・削減率の前提だけを出します（計算は画面側で行います）。
- 社内の事例の番号は、一覧にあるものだけを使います。
- 日本語の、です・ます調で書きます。`;

const ESTIMATE_SYSTEM = `あなたは、IT 部門の業務改善の効果を見積もる担当です。
投稿された困りごと・解決策の文章から、手作業の回数（月）・1回の分・人数・解決策で減らせる割合を見積もります。
文章に数字があればそれを使い、無ければ IT 部門でよくある値を推定して、その旨を assumptions に日本語で書きます。`;

export function casesText(cases: Post[]) {
  if (!cases.length) return "（社内の事例：まだ似たものはありません）";
  return [
    "社内の事例（この中だけを紹介してよい）",
    ...cases.map(
      (c) =>
        `- ${postCode(c.kind, c.id)}（${c.teamName}）${c.title}：${c.summary}` +
        (c.kind === "solution" ? ` ／ 横展開 ${c.adoptions}チーム` : ""),
    ),
  ].join("\n");
}

function transcript(worry: string, messages: ChatMessage[]) {
  return [
    `最初の悩み：${worry}`,
    ...messages.map((m) => `${m.role === "user" ? "社員" : "賢者"}：${m.content}`),
  ].join("\n");
}

// ── 対話（少しずつ返す） ───────────────────────

export async function* sageReply(worry: string, history: ChatMessage[], cases: Post[]): AsyncGenerator<string> {
  if (!aiConnected()) {
    yield* demoReply(worry, history, cases);
    return;
  }
  // 最初の悩みを、最初の発言として渡す
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
    { role: "user", content: worry },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];
  const stream = getClient().beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: [{ type: "text", text: `${SAGE_SYSTEM}\n\n${casesText(cases)}`, cache_control: { type: "ephemeral" } }],
    messages,
  });
  for await (const ev of stream) {
    if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") yield "\n（この内容には、賢者は答えられませんでした。言い方を変えてみてください）";
}

// ── 企画書 ──────────────────────────────────

export async function makePlan(worry: string, history: ChatMessage[], cases: Post[]): Promise<Plan> {
  if (!aiConnected()) return demoPlan(worry, history, cases);
  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(PlanSchema) },
    system: [{ type: "text", text: `${PLAN_SYSTEM}\n\n${casesText(cases)}` }],
    messages: [{ role: "user", content: `次の壁打ちの記録を、企画書にまとめてください。\n\n${transcript(worry, history)}` }],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) {
    throw new Error("企画書をまとめられませんでした。対話を少し足してから、もう一度お試しください。");
  }
  const plan = res.parsed_output;
  // 一覧に無い事例の番号を、念のため落とす
  const known = new Set(cases.map((c) => c.id));
  plan.related_case_ids = plan.related_case_ids.filter((id) => known.has(id));
  plan.recommended_index = Math.min(Math.max(plan.recommended_index, 0), plan.solutions.length - 1);
  return plan;
}

// ── 投稿の効果の見積もり ───────────────────────

export type Estimate = z.infer<typeof EstimateSchema>;

export async function estimateEffect(kind: "problem" | "solution", text: string): Promise<Estimate> {
  if (!aiConnected()) {
    const n = numbersIn(text);
    return {
      times_per_month: n.times ?? 20,
      minutes_per_time: n.minutes ?? 30,
      people: n.people ?? 1,
      reduction_rate: kind === "solution" ? 0.6 : 0.5,
      assumptions: "デモの見積もりです（AI につながっていません）。文章の中の数字を拾い、無いものは月20回・30分・1人・削減率5〜6割と置きました。",
    };
  }
  const res = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(EstimateSchema) },
    system: ESTIMATE_SYSTEM,
    messages: [{ role: "user", content: `種類：${kind === "problem" ? "困りごと" : "解決策"}\n\n${text}` }],
  });
  if (!res.parsed_output) throw new Error("見積もれませんでした");
  return res.parsed_output;
}

// ============================================================
// デモの応答（AI につながっていないとき）。⚠️ 画面には必ず「デモ」と出す
// ============================================================

function numbersIn(text: string) {
  const pick = (re: RegExp) => {
    const m = text.match(re);
    return m ? Number(m[1].replace(/,/g, "")) : undefined;
  };
  const hours = pick(/([\d.]+)\s*時間/);
  return {
    times: pick(/(?:月|毎月)\s*([\d,]+)\s*(?:回|件)/) ?? pick(/([\d,]+)\s*(?:回|件)/),
    minutes: pick(/([\d,]+)\s*分/) ?? (hours !== undefined ? hours * 60 : undefined),
    people: pick(/([\d,]+)\s*人/),
  };
}

async function* demoReply(worry: string, history: ChatMessage[], cases: Post[]) {
  const turn = history.filter((m) => m.role === "user").length;
  const solution = cases.find((c) => c.kind === "solution");
  const lines = [
    `「${worry.slice(0, 40)}」ですね。まず状況を教えてください。それは月に何回くらいあって、1回にどのくらい時間がかかっていますか？ 関わっている人は何人でしょう。`,
    "ありがとうございます。では、本当はどうなっていてほしいですか？ 理想の状態を、ひとことで教えてください。",
    solution
      ? `いいですね。社内では ${postCode(solution.kind, solution.id)}「${solution.title}」（${solution.teamName}）のような事例もあります。使えるツールや、気をつけたいこと（セキュリティ・予算など）はありますか？`
      : "いいですね。使えるツールや、気をつけたいこと（セキュリティ・予算など）はありますか？",
    "材料がそろってきました。「企画書にまとめる」を押すと、あるべき姿・問題・課題・解決策の形に整理します。",
  ];
  const text = `${lines[Math.min(turn, lines.length - 1)]}\n（デモの応答です。AI にはつながっていません）`;
  // 本物の AI と同じく、少しずつ流す
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i += 6) {
    await new Promise((r) => setTimeout(r, 25));
    yield chars.slice(i, i + 6).join("");
  }
}

function demoPlan(worry: string, history: ChatMessage[], cases: Post[]): Plan {
  const said = history.filter((m) => m.role === "user").map((m) => m.content).join("\n");
  const n = numbersIn(`${worry}\n${said}`);
  const times = n.times ?? 20;
  const minutes = n.minutes ?? 30;
  const people = n.people ?? 1;
  const known = cases.filter((c) => c.kind === "solution").slice(0, 2);
  const est = (rate: number, how: string) => ({
    times_per_month: times,
    minutes_per_time: minutes,
    people,
    reduction_rate: rate,
    assumptions: `${n.times ? "回数は対話から" : "回数は推定（月20回）"}、${n.minutes ? "時間は対話から" : "時間は推定（1回30分）"}、${n.people ? "人数は対話から" : "人数は推定（1人）"}。削減率は${how}の目安。`,
  });
  return {
    title: `「${worry.slice(0, 20)}」を減らす`,
    to_be: "同じ作業に毎回人の手がかからず、担当者が判断の要る仕事に時間を使えている。",
    as_is: `${worry}。${n.times ? `月に${times}回ほど` : "定期的に"}、${people}人で対応している。`,
    problem: "定型の作業に、毎回人の時間と注意が取られている。やり方が人に依存し、ほかの人やチームに広がらない。",
    issues: ["作業の手順と判断の基準を書き出す", "自動化できる部分と、人が見るべき部分を分ける", "小さく試して、効果を数字で確かめる"],
    solutions: [
      {
        name: "定型部分を自動化する",
        summary: "Power Automate で、決まった手順の部分だけを自動で流す。",
        approach: "いまの手順を書き出し、入力・転記・通知のように判断の要らない部分を Power Automate のフローにする。人は例外だけを見る。",
        tools: ["Power Automate", "SharePoint", "Microsoft Teams"],
        steps: [
          { title: "手順を書き出す", detail: "いまのやり方を5〜10行で書き、判断が要る所に印をつける", duration: "2日" },
          { title: "小さく作る", detail: "いちばん回数の多い部分だけをフローにする", duration: "1週間" },
          { title: "並行して試す", detail: "2週間、手作業と並べて結果を比べる", duration: "2週間" },
          { title: "共有する", detail: "結果を QuestForge に解決策として投稿する", duration: "1日" },
        ],
        difficulty: "易しい",
        estimate: est(0.5, "定型部分の自動化"),
        impact_path: {
          output: "手作業の時間が半分ほどに減る",
          outcome: "担当者が例外や改善に時間を使える。対応のばらつきが減る",
          impact: "人件費の削減と、対応品質の安定",
        },
        risks: ["例外の多い作業では効果が小さい", "フローの持ち主を決めないと、止まったときに気づけない"],
      },
      {
        name: "AI エージェントに一次対応を任せる",
        summary: "生成 AI に内容を読ませ、下書き・振り分けまでを任せる。",
        approach: "Copilot Studio などで、作業の入力を読んで下書きや振り分けを作るエージェントを作る。人は確認して確定するだけにする。",
        tools: ["Copilot Studio", "Azure OpenAI", "Power Automate"],
        steps: [
          { title: "例を集める", detail: "過去の作業の例を20〜50件集める", duration: "1週間" },
          { title: "試作する", detail: "例を知識として入れたエージェントを作る", duration: "2週間" },
          { title: "精度を測る", detail: "そのまま使えた割合を数える", duration: "2週間" },
          { title: "本番に入れる", detail: "人の確認を残したまま運用に入れる", duration: "1週間" },
        ],
        difficulty: "ふつう",
        estimate: est(0.7, "AI による下書き・振り分け"),
        impact_path: {
          output: "1件あたりの対応時間が3割ほどに減る",
          outcome: "対応の速さがそろい、待ち時間が減る",
          impact: "人件費の削減と、依頼する側の満足度の向上",
        },
        risks: ["AI の誤りを人が確かめる手順が要る", "社外秘の情報の扱いを、セキュリティ担当と決める"],
      },
    ],
    recommended_index: 0,
    recommended_reason: "まず定型部分の自動化で効果を確かめ、そのうえで AI に広げると、失敗の小さい順に進められるため。",
    related_case_ids: known.map((c) => c.id),
    first_step: "明日、いまの手順を5〜10行で書き出し、判断が要る所に印をつける。",
    category: (known[0]?.category as Plan["category"]) ?? "その他",
    tags: ["自動化", "定型作業"],
  };
}
