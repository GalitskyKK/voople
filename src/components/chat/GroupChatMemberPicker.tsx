import { Check, Search, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { UserSearchHit } from "@/types/search";

type GroupChatMemberPickerProps = {
  query: string;
  users: UserSearchHit[];
  selected: UserSearchHit[];
  searching: boolean;
  onQueryChange: (value: string) => void;
  onToggleUser: (user: UserSearchHit) => void;
  renderAvatar: (user: UserSearchHit) => ReactNode;
};

export function GroupChatMemberPicker({
  query,
  users,
  selected,
  searching,
  onQueryChange,
  onToggleUser,
  renderAvatar,
}: GroupChatMemberPickerProps) {
  return (
    <>
      {selected.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selected.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => onToggleUser(user)}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--app-accent-soft)] px-2.5 py-1 text-xs text-(--theme-accent)"
            >
              @{user.username}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      ) : null}

      <label className="relative mt-4 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Найти человека"
          className="voople-input w-full pl-9"
        />
      </label>

      <div className="voople-scroll mt-2 max-h-64 space-y-1 overflow-y-auto">
        {searching ? <div className="h-16 animate-pulse rounded-xl bg-[var(--app-surface-soft)]" /> : null}
        {!searching
          ? users.map((user) => {
              const active = selected.some((item) => item.id === user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => onToggleUser(user)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition",
                    active
                      ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)]"
                      : "border-transparent hover:bg-[var(--app-surface-soft)]",
                  )}
                >
                  {renderAvatar(user)}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{user.displayName}</span>
                    <span className="block truncate text-xs text-[var(--app-muted)]">@{user.username}</span>
                  </span>
                  {active ? <Check className="h-4 w-4 text-(--theme-accent)" /> : null}
                </button>
              );
            })
          : null}
        {query.trim() && !searching && users.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--app-muted)]">Никого не нашли</p>
        ) : null}
      </div>
    </>
  );
}
