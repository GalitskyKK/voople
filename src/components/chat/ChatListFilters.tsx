import { cn } from "@/lib/utils";

export type ChatSearchScope = "all" | "people" | "groups";

export function ChatListFilters({
  searchScope,
  onSearchScopeChange,
}: {
  searchScope: ChatSearchScope;
  onSearchScopeChange: (scope: ChatSearchScope) => void;
}) {
  const options = [
    ["all", "Все"],
    ["people", "Люди"],
    ["groups", "Группы"],
  ] as const;

  return (
    <div
      className="grid grid-cols-3 rounded-xl bg-[var(--app-surface-soft)] p-1"
      aria-label="Область поиска"
    >
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => {
            onSearchScopeChange(id);
          }}
          aria-pressed={searchScope === id}
          className={cn(
            "rounded-lg px-2 py-1.5 text-xs font-medium transition",
            searchScope === id
              ? "bg-[var(--app-surface)] text-[var(--foreground)] shadow-[var(--app-shadow-sm)]"
              : "text-[var(--app-muted)] hover:text-[var(--foreground)]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
