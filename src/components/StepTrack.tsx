import { FORGE_STEPS } from "@/lib/constants";

// 壁打ちの段：悩み → 問題 → 課題 → 解決策 → 実現方法。
// current を渡すと、その前は「済み」、その段は「いま」として光る。渡さなければ道のりの案内だけ
export function StepTrack({ current, complete, compact }: { current?: number; complete?: boolean; compact?: boolean }) {
  return (
    <ol className={`steptrack${compact ? " steptrack--compact" : ""}`} aria-label="賢者との壁打ちの段">
      {FORGE_STEPS.map((s, i) => {
        const state =
          current === undefined ? undefined : complete || i < current ? "is-done" : i === current ? "is-now" : undefined;
        return (
          <li key={s.key} className={state} aria-current={state === "is-now" ? "step" : undefined}>
            <span className="steptrack__en">
              {String(i + 1).padStart(2, "0")} {s.en}
            </span>
            <span className="steptrack__label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
