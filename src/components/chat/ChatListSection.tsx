import type { ReactNode } from "react";

export function ChatListSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">
        {title}
      </h2>
      <ul className="voople-chat-list space-y-0.5">{children}</ul>
    </section>
  );
}
