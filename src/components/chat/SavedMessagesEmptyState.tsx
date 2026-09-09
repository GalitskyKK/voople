import { Bookmark } from "lucide-react";

export function SavedMessagesEmptyState({ searching }: { searching: boolean }) {
  return (
    <section className="w-full max-w-md pb-4 pt-10 text-left">
      <span className="grid h-10 w-10 place-items-center rounded-[var(--app-radius-md)] bg-[var(--app-accent-soft)] text-[var(--theme-accent)]">
        <Bookmark className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--theme-accent)]">
        Личное пространство
      </p>
      <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)] sm:text-xl">
        {searching ? "Ничего не найдено" : "Сохраняйте важное здесь"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
        {searching
          ? "Попробуйте изменить запрос — поиск видит только ваши сообщения."
          : "Отправляйте себе текст, файлы и музыку. Эти сообщения не появляются в чатах, уведомлениях или рекомендациях."}
      </p>
    </section>
  );
}
