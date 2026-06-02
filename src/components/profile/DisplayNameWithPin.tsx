import type { CSSProperties, ReactNode } from "react";

import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";
import { cn } from "@/lib/utils";

const PIN_BY_SIZE = {
  xs: { px: 16, className: "h-4 w-4" },
  sm: { px: 18, className: "h-[18px] w-[18px]" },
  md: { px: 22, className: "h-[22px] w-[22px]" },
} as const;

export type DisplayNameWithPinSize = keyof typeof PIN_BY_SIZE;

type DisplayNameWithPinProps = {
  children: ReactNode;
  hasVooplePlus?: boolean;
  size?: DisplayNameWithPinSize;
  /** Обёртка (flex, отступы). */
  className?: string;
  /** Стили текста имени; gradient/color — сюда, не на обёртку. */
  nameClassName?: string;
  /** backgroundImage градиента — на span с именем. */
  style?: CSSProperties;
  as?: "span" | "div";
};

/**
 * Display name + Voople+ pin. Текст в inner span (truncate); pin не ломает flex.
 */
export function DisplayNameWithPin({
  children,
  hasVooplePlus = false,
  size = "sm",
  className,
  nameClassName,
  style,
  as: Tag = "span",
}: DisplayNameWithPinProps) {
  const pin = PIN_BY_SIZE[size];
  const showPin = hasVooplePlus === true;

  return (
    <Tag className={cn("inline-flex max-w-full min-w-0 items-center gap-1", className)}>
      <span className={cn("min-w-0 truncate", nameClassName)} style={style}>
        {children}
      </span>
      {showPin ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- CDN mascot pin */}
          <img
            src={vooplusBadgeUrl()}
            alt=""
            width={pin.px}
            height={pin.px}
            className={cn(
              "shrink-0 translate-y-px object-contain object-center",
              pin.className,
              "drop-shadow-[0_1px_4px_color-mix(in_srgb,var(--theme-accent)_45%,transparent)]",
            )}
            decoding="async"
            aria-hidden
          />
          <span className="sr-only">Voople+</span>
        </>
      ) : null}
    </Tag>
  );
}
