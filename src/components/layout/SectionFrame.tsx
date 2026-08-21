import { cn } from "@/lib/utils";

type SectionFrameProps = {
  children: React.ReactNode;
  /** @deprecated Use size="wide". */
  wide?: boolean;
  size?: "reading" | "wide" | "full";
  className?: string;
};

/** Единая колонка контента как в Поиске / Уведомлениях. */
export function SectionFrame({ children, wide = false, size, className }: SectionFrameProps) {
  const resolvedSize = size ?? (wide ? "wide" : "reading");
  return (
    <div
      className={cn(
        "voople-section-frame mx-auto flex w-full min-h-0 flex-1 flex-col",
        resolvedSize === "full"
          ? "max-w-none"
          : resolvedSize === "wide"
            ? "max-w-6xl"
            : "max-w-2xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
