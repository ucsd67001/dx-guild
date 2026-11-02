// 選択肢の一覧。投稿フォームと絞り込みの両方で使う

export const CATEGORIES = [
  "問い合わせ対応",
  "申請・承認",
  "アカウント・権限管理",
  "資産管理",
  "監視・運用",
  "データ集計・レポート",
  "ドキュメント作成",
  "会議・議事録",
  "その他",
] as const;

export const TOOLS = [
  "Power Automate",
  "Power Apps",
  "Copilot Studio",
  "Microsoft 365 Copilot",
  "SharePoint",
  "Microsoft Teams",
  "Excel / VBA",
  "Python",
  "Azure OpenAI",
  "Dify",
  "n8n",
  "UiPath",
  "ServiceNow",
  "Google Apps Script",
] as const;

// 解決策の段階
export const STAGES = {
  idea: "構想",
  pilot: "試行中",
  live: "運用中",
} as const;

export type Kind = "problem" | "solution";
export type Stage = keyof typeof STAGES;

export const KIND_LABEL: Record<Kind, string> = {
  problem: "困りごと",
  solution: "解決策",
};

// 画面に出す通し番号（PRB-0007 / SOL-0012）
export function postCode(kind: Kind, id: number) {
  return `${kind === "problem" ? "PRB" : "SOL"}-${String(id).padStart(4, "0")}`;
}

// "2026-10-30 12:00:00" → "2026.10.30"
export function fmtDate(s: string) {
  return s.slice(0, 10).replaceAll("-", ".");
}

// ── プロダクト ─────────────────────────────
// ⚠️ 名前を替えるときは、ここと README・CLAUDE.md・docs/hackathon.md・AI の指示（ai.ts）
export const PRODUCT = {
  name: "DXギルド",
  en: "DX GUILD",
  tagline: "悩みを、クエストに。閃きを、成果に。",
  version: "v0.3",
};

// 効果をお金に換える時間単価（円／時間）。社内の基準に合わせて .env.local で替える
export const HOURLY_COST = Number(process.env.DXG_HOURLY_COST) || 5000;

export function yen(n: number) {
  return `${Math.round(n).toLocaleString()}円`;
}

// 狭い欄に置く金額（18万円）。単位の「万円」は呼ぶ側で添える
export function man(n: number) {
  return (n / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

// 効果の試算。AI には数字の前提だけを出させ、計算はここで行う（AI に掛け算をさせない）
export type EffortInput = {
  timesPerMonth: number;
  minutesPerTime: number;
  people: number;
  reductionRate: number; // 0〜1
};

export function calcEffect(e: EffortInput) {
  const rate = Math.min(Math.max(e.reductionRate, 0), 1);
  const current = (Math.max(e.timesPerMonth, 0) * Math.max(e.minutesPerTime, 0) * Math.max(e.people, 0)) / 60;
  const saved = current * rate;
  return {
    currentHours: Math.round(current * 10) / 10,
    savedHours: Math.round(saved * 10) / 10,
    savedYenPerYear: saved * 12 * HOURLY_COST,
  };
}
