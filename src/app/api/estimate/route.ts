import { estimateEffect } from "@/lib/ai";

// 投稿フォームの「AI に見積もってもらう」。回数・分・人数・削減率の前提だけを返す（計算は画面で）
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { kind?: unknown; text?: unknown };
  const kind = body.kind === "solution" ? "solution" : "problem";
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 6000) : "";
  if (text.length < 5) return Response.json({ error: "題か説明を先に書いてください" }, { status: 400 });
  try {
    return Response.json(await estimateEffect(kind, text));
  } catch (e) {
    console.error(e);
    return Response.json({ error: "見積もれませんでした。少し待って、もう一度お試しください" }, { status: 500 });
  }
}
