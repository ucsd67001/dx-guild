"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatMessage } from "@/lib/ai";
import { FORGE_STEPS, splitStepTag } from "@/lib/constants";
import { StepTrack } from "./StepTrack";

// 賢者との対話。返事は少しずつ届くので、届いたぶんから表示する
export function ForgeChat({
  sessionId,
  worry,
  userName,
  initialMessages,
  canTalk,
  hasPlan,
}: {
  sessionId: number;
  worry: string;
  userName: string;
  initialMessages: ChatMessage[];
  canTalk: boolean;
  hasPlan: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<"chat" | "plan" | null>(null);
  const [error, setError] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const opened = useRef(false);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function talk(message: string) {
    setBusy("chat");
    setError("");
    const base: ChatMessage[] = message ? [...messages, { role: "user", content: message }] : messages;
    setMessages([...base, { role: "assistant", content: "" }]);
    try {
      const res = await fetch(`/api/forge/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages([...base, { role: "assistant", content: reply }]);
      }
    } catch (e) {
      setMessages(base);
      setError(e instanceof Error && e.message ? e.message : "送れませんでした");
    } finally {
      setBusy(null);
    }
  }

  // 開いたときに対話がまだ無ければ、賢者から話しかける
  useEffect(() => {
    if (canTalk && initialMessages.length === 0 && !opened.current) {
      opened.current = true;
      void talk("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send() {
    const m = draft.trim();
    if (!m || busy) return;
    setDraft("");
    void talk(m);
  }

  async function makePlan() {
    setBusy("plan");
    setError("");
    try {
      const res = await fetch(`/api/forge/${sessionId}/plan`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "まとめられませんでした");
      router.refresh();
      setTimeout(() => document.getElementById("plan")?.scrollIntoView({ behavior: "smooth" }), 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "まとめられませんでした");
    } finally {
      setBusy(null);
    }
  }

  const userTurns = messages.filter((m) => m.role === "user").length;
  // いまの段は、賢者がこれまでに書いた段の札のうち、いちばん先のもの（札が無ければ「問題」から）
  const reached = messages.reduce((n, m) => (m.role === "assistant" ? Math.max(n, splitStepTag(m.content).step ?? 0) : n), 1);

  return (
    <div className="chat">
      <StepTrack current={reached} complete={hasPlan} />
      <div className="chat__log" ref={logRef}>
        <div className="bubble bubble--user">
          <span className="bubble__who mono">{userName} · 悩み</span>
          <p>{worry}</p>
        </div>
        {messages.map((m, i) => {
          const { step, body } = m.role === "assistant" ? splitStepTag(m.content) : { step: null, body: m.content };
          return (
            <div key={i} className={`bubble bubble--${m.role}`}>
              <span className="bubble__who mono">
                {m.role === "assistant" ? "SAGE · 賢者" : userName}
                {step !== null && <em className="bubble__step">{FORGE_STEPS[step].label}</em>}
              </span>
              <p>
                {body}
                {busy === "chat" && i === messages.length - 1 && m.role === "assistant" && <i className="caret" aria-hidden />}
              </p>
            </div>
          );
        })}
      </div>

      {error && <p className="chat__error" role="alert">{error}</p>}

      {canTalk ? (
        <div className="chat__input">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
            }}
            rows={3}
            maxLength={2000}
            placeholder="賢者に答える（Ctrl + Enter で送る）"
            disabled={!!busy}
          />
          <div className="chat__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={makePlan} disabled={!!busy || userTurns === 0}>
              {busy === "plan" ? "賢者が企画書を書いています…" : hasPlan ? "企画書を作り直す" : "企画書にまとめる"}
            </button>
            <button type="button" className="btn btn--primary btn--sm" onClick={send} disabled={!!busy || !draft.trim()}>
              送る <span aria-hidden>→</span>
            </button>
          </div>
          {busy === "plan" && <p className="small dim">30秒〜1分ほどかかります。問題・課題・解決策・実現方法の順に整理しています。</p>}
        </div>
      ) : (
        <p className="small dim">この対話は、始めた人だけが続けられます。</p>
      )}
    </div>
  );
}
