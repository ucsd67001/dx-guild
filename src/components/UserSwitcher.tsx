"use client";

import type { User } from "@/lib/data";

// 右上の「だれとして使うか」。選んだらすぐ切り替える（ログインの代わり）
export function UserSwitcher({
  users,
  currentId,
  action,
}: {
  users: User[];
  currentId: number;
  action: (form: FormData) => Promise<void>;
}) {
  const teams = [...new Map(users.map((u) => [u.teamId, u.teamName])).entries()];
  return (
    <form action={action} className="switcher">
      <label className="switcher__label" htmlFor="uid">
        USER
      </label>
      <select
        id="uid"
        name="uid"
        defaultValue={currentId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label="使う人を切り替える"
      >
        {teams.map(([teamId, teamName]) => (
          <optgroup key={teamId} label={teamName}>
            {users
              .filter((u) => u.teamId === teamId)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}（{u.teamCode}）
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </form>
  );
}
