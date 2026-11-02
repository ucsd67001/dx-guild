"use client";

import { useEffect, useRef, useState } from "react";
import { calcEffect } from "@/lib/constants";

// 投稿フォームの「効果の試算」。回数・分・人数・削減率から時間を出し、hours として送る。
// 「AI に見積もってもらう」は、題と説明から前提の数字だけを埋める（計算はここで）
export function EffectCalculator({ hourlyCost }: { hourlyCost: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [kind, setKind] = useState<"problem" | "solution">("problem");
  const [v, setV] = useState({ times: "", minutes: "", people: "1", rate: "50" });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // フォームの種類（困りごと／解決策）の切り替えを見る
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const read = () => setKind(new FormData(form).get("kind") === "solution" ? "solution" : "problem");
    read();
    form.addEventListener("change", read);
    return () => form.removeEventListener("change", read);
  }, []);

  const e = calcEffect({
    timesPerMonth: Number(v.times) || 0,
    minutesPerTime: Number(v.minutes) || 0,
    people: Number(v.people) || 0,
    reductionRate: (Number(v.rate) || 0) / 100,
  });
  const hours = kind === "problem" ? e.currentHours : e.savedHours;

  async function askAI() {
    const form = ref.current?.closest("form");
    if (!form) return;
    const fd = new FormData(form);
    const text = ["title", "summary", "body"].map((k) => String(fd.get(k) ?? "")).join("\n").trim();
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setV({
        times: String(data.times_per_month),
        minutes: String(data.minutes_per_time),
        people: String(data.people),
        rate: String(Math.round(data.reduction_rate * 100)),
      });
      setNote(data.assumptions);
    } catch (err) {
      setNote(err instanceof Error && err.message ? err.message : "見積もれませんでした");
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof v) => (ev: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: ev.target.value });

  return (
    <div className="calc" ref={ref}>
      <div className="calc__head">
        <span className="field__label">
          効果の試算 <span className="dim small">（{kind === "problem" ? "手作業にかかっている時間" : "解決策で減った時間"}）</span>
        </span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={askAI} disabled={busy}>
          {busy ? "見積もり中…" : "✦ AI に見積もってもらう"}
        </button>
      </div>
      <div className="calc__row">
        <label><span className="mono">回／月</span><input type="number" min={0} value={v.times} onChange={set("times")} placeholder="20" /></label>
        <span className="calc__op">×</span>
        <label><span className="mono">分／回</span><input type="number" min={0} value={v.minutes} onChange={set("minutes")} placeholder="30" /></label>
        <span className="calc__op">×</span>
        <label><span className="mono">人</span><input type="number" min={0} value={v.people} onChange={set("people")} /></label>
        {kind === "solution" && (
          <>
            <span className="calc__op">×</span>
            <label><span className="mono">削減率 %</span><input type="number" min={0} max={100} value={v.rate} onChange={set("rate")} /></label>
          </>
        )}
        <span className="calc__op">=</span>
        <div className="calc__result">
          <b className="mono">{kind === "solution" ? "−" : ""}{hours}<small>h／月</small></b>
          {kind === "solution" && <span className="small dim">年 {Math.round(e.savedHours * 12 * hourlyCost).toLocaleString()}円（{hourlyCost.toLocaleString()}円/h）</span>}
        </div>
      </div>
      {note && <p className="small dim calc__note">{note}</p>}
      <input type="hidden" name="hours" value={hours || ""} />
    </div>
  );
}
