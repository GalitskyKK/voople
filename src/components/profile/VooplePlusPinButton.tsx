"use client";

import { useState } from "react";

import { vooplusBadgeUrl } from "@/lib/constants/vooplus-badge";
import { cn } from "@/lib/utils";
import type { DisplayNameWithPinSize } from "./DisplayNameWithPin";
import { VooplePlusInfoModal } from "./VooplePlusInfoModal";

const PIN_BY_SIZE = {
  xs: { px: 16, className: "h-4 w-4" },
  sm: { px: 18, className: "h-[18px] w-[18px]" },
  md: { px: 22, className: "h-[22px] w-[22px]" },
} as const;

type VooplePlusPinButtonProps = {
  size?: DisplayNameWithPinSize;
  expiresAt?: string | null;
  className?: string;
};

export function VooplePlusPinButton({
  size = "sm",
  expiresAt,
  className,
}: VooplePlusPinButtonProps) {
  const [open, setOpen] = useState(false);
  const pin = PIN_BY_SIZE[size];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex shrink-0 cursor-pointer rounded-md p-0.5 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--theme-accent)",
          className,
        )}
        aria-label="Подробнее о Voople+"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- CDN mascot pin */}
        <img
          src={vooplusBadgeUrl()}
          alt=""
          width={pin.px}
          height={pin.px}
          className={cn(
            "object-contain object-center",
            pin.className,
            "drop-shadow-[0_1px_4px_color-mix(in_srgb,var(--theme-accent)_45%,transparent)]",
          )}
          decoding="async"
        />
      </button>
      <VooplePlusInfoModal open={open} onClose={() => setOpen(false)} expiresAt={expiresAt} />
    </>
  );
}
