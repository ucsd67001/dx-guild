"use client";

import { useRef } from "react";

const EXAMPLES = [
  "毎週の報告資料づくりが、コピペばかりでめんどう",
  "同じ質問に何度も答えている気がする",
  "申請の承認がどこで止まっているか分からない",
  "会議のあとの議事録づくりがつらい",
];

// 悩みのひとこと。例を押すと欄に入る
export function WorryForm({ action }: { action: (form: FormData) => Promise<void> }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <form action={action} className="worry-form">
      <label className="field">
        <span className="field__label">いま、どんなことに困っていますか？</span>
        <textarea ref={ref} name="worry" required maxLength={400} rows={4} placeholder="例：毎週月曜の集計がめんどう。Excel でピボットを作って…" />
      </label>
      <div className="examples">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            type="button"
            className="example"
            onClick={() => {
              if (ref.current) {
                ref.current.value = e;
                ref.current.focus();
              }
            }}
          >
            {e}
          </button>
        ))}
      </div>
      <button className="btn btn--primary">
        賢者に相談する <span aria-hidden>→</span>
      </button>
    </form>
  );
}
