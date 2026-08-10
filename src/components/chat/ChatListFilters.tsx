import { cn } from "@/lib/utils";

export type ChatListFilter = "all" | "direct" | "group";
export type ChatSearchScope = "all" | "people" | "groups";

export function ChatListFilters({
  searchActive,
  filter,
  searchScope,
  onFilterChange,
  onSearchScopeChange,
}: {
  searchActive: boolean;
  filter: ChatListFilter;
  searchScope: ChatSearchScope;
  onFilterChange: (filter: ChatListFilter) => void;
  onSearchScopeChange: (scope: ChatSearchScope) => void;
}) {
  const options = searchActive
    ? ([
        ["all", "Все"],
        ["people", "Люди"],
        ["groups", "Группы"],
      ] as const)
    : ([
        ["all", "Все"],
        ["direct", "Личные"],
        ["group", "Группы"],
      ] as const);
  const selected = searchActive ? searchScope : filter;

  return (
    <div
      className="grid grid-cols-3 rounded-xl bg-[var(--app-surface-soft)] p-1"
      aria-label={searchActive ? "Область поиска" : "Фильтр чатов"}
    >
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => {
            if (searchActive) onSearchScopeChange(id as ChatSearchScope);
            else onFilterChange(id as ChatListFilter);
          }}
          aria-pressed={selected === id}
          className={cn(
            "rounded-lg px-2 py-1.5 text-xs font-medium transition",
            selected === id
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
