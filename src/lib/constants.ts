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
