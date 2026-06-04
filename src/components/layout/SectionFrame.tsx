import { cn } from "@/lib/utils";

type SectionFrameProps = {
  children: React.ReactNode;
  /** Широкий каркас для мессенджера (две колонки). */
  wide?: boolean;
  className?: string;
};

/** Единая колонка контента как в Поиске / Уведомлениях. */
export function SectionFrame({ children, wide = false, className }: SectionFrameProps) {
  return (
    <div
      className={cn(
        "voople-section-frame mx-auto flex w-full min-h-0 flex-1 flex-col",
        wide ? "max-w-5xl" : "max-w-2xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
