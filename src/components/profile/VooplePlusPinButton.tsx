"use client";

import { lazy, Suspense, useState } from "react";

import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";
import { cn } from "@/lib/utils";
import type { DisplayNameWithPinSize } from "./DisplayNameWithPin";

const VooplePlusInfoModal = lazy(() =>
  import("./VooplePlusInfoModal").then((module) => ({
    default: module.VooplePlusInfoModal,
  })),
);

const PIN_BY_SIZE = {
  xs: { px: 16, className: "h-4 w-4" },
  sm: { px: 18, className: "h-[18px] w-[18px]" },
  md: { px: 22, className: "h-[22px] w-[22px]" },
} as const;

type VooplePlusPinButtonProps = {
  size?: DisplayNameWithPinSize;
  expiresAt?: string | null;
  badgeUrl?: string;
  className?: string;
  interactive?: boolean;
};

export function VooplePlusPinButton({
  size = "sm",
  expiresAt,
  badgeUrl,
  className,
  interactive = true,
}: VooplePlusPinButtonProps) {
  const [open, setOpen] = useState(false);
  const pin = PIN_BY_SIZE[size];

  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- CDN mascot pin
    <img
      src={badgeUrl ?? vooplusBadgeUrl()}
      alt=""
      width={pin.px}
      height={pin.px}
      className={cn(
        "voople-plus-pin__image object-contain object-center",
        pin.className,
        "drop-shadow-[0_1px_4px_color-mix(in_srgb,var(--theme-accent)_45%,transparent)]",
      )}
      decoding="async"
    />
  );

  if (!interactive) {
    return (
      <span
        className={cn(
          "voople-plus-pin inline-flex shrink-0 p-0.5",
          className,
        )}
        aria-hidden="true"
      >
        {image}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "voople-plus-pin inline-flex shrink-0 cursor-pointer rounded-md p-0.5 transition hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--theme-accent)",
          className,
        )}
        aria-label="Подробнее о Вупл+"
      >
        {image}
      </button>

      {open ? (
        <Suspense fallback={null}>
          <VooplePlusInfoModal
            open
            onClose={() => setOpen(false)}
            expiresAt={expiresAt}
          />
        </Suspense>
      ) : null}
    </>
  );
}
