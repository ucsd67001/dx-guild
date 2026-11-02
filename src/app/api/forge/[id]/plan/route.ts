import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/data";
import { getForgeSession, savePlan, searchCases } from "@/lib/forge";
import { aiConnected, makePlan } from "@/lib/ai";

// 対話の記録を、企画書（あるべき姿・現状・問題・課題・解決策）にまとめる
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  const session = getForgeSession(Number((await params).id));
  if (!session) return Response.json({ error: "見つかりません" }, { status: 404 });
  if (session.userId !== me.id) return Response.json({ error: "始めた人だけがまとめられます" }, { status: 403 });

  try {
    const cases = searchCases(`${session.worry}\n${session.messages.map((m) => m.content).join("\n")}`);
    const plan = await makePlan(session.worry, session.messages, cases);
    savePlan(session.id, plan, !aiConnected());
    revalidatePath("/", "layout");
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "まとめられませんでした" }, { status: 500 });
  }
}
