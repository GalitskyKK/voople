import { cn } from "@/lib/utils";

type SectionPageHeaderProps = {
  title: string;
  description?: string;
  className?: string;
};

/** Единый заголовок разделов (поиск, уведомления, сообщения). */
export function SectionPageHeader({ title, description, className }: SectionPageHeaderProps) {
  return (
    <header
      className={cn(
        "voople-section-header shrink-0 border-b border-[var(--app-border)] px-4 py-4 lg:px-6",
        className,
      )}
    >
      <h1 className="text-2xl font-bold tracking-[-0.02em]">{title}</h1>
      {description && <p className="mt-1 text-sm text-[var(--app-muted)]">{description}</p>}
    </header>
  );
}
