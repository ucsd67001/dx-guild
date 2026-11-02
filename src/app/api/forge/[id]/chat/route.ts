import { getCurrentUser } from "@/lib/data";
import { getForgeSession, saveMessages, searchCases } from "@/lib/forge";
import { AiSetupError, aiConnected, sageReply, type ChatMessage } from "@/lib/ai";

// 賢者との対話の一往復。返事は少しずつ（テキストのストリームで）返し、最後に記録する。
// message が空なら、賢者の最初のひとこと（悩みへの問いかけ）だけを返す
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  const session = getForgeSession(Number((await params).id));
  if (!session) return new Response("見つかりません", { status: 404 });
  if (session.userId !== me.id) return new Response("この対話は、始めた人だけが続けられます", { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { message?: unknown };
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  if (!message && session.messages.length > 0) return new Response("ことばが空です", { status: 400 });

  const history: ChatMessage[] = message ? [...session.messages, { role: "user", content: message }] : [];
  const cases = searchCases(`${session.worry}\n${history.map((m) => m.content).join("\n")}`);
  const demo = !aiConnected();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let reply = "";
      try {
        for await (const chunk of sageReply(session.worry, history, cases)) {
          reply += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
        saveMessages(session.id, [...history, { role: "assistant", content: reply }], demo);
      } catch (e) {
        console.error(e);
        const note = e instanceof AiSetupError ? e.message : "賢者との通信がとぎれました。少し待って、もう一度送ってください";
        controller.enqueue(encoder.encode(`\n（${note}）`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
