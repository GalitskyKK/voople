"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { VooplePlusPinButton } from "./VooplePlusPinButton";

const PIN_BY_SIZE = {
  xs: "xs",
  sm: "sm",
  md: "md",
} as const;

export type DisplayNameWithPinSize = keyof typeof PIN_BY_SIZE;

type DisplayNameWithPinProps = {
  children: ReactNode;
  hasVooplePlus?: boolean;
  size?: DisplayNameWithPinSize;
  pinInteractive?: boolean;
  /** Дата окончания подписки (если есть — в модалке). */
  subscriptionExpiresAt?: string | null;
  badgeUrl?: string;
  className?: string;
  nameClassName?: string;
  style?: CSSProperties;
  as?: "span" | "div";
};

/**
 * Display name + Voople+ pin (клик по pin → модалка).
 */
export function DisplayNameWithPin({
  children,
  hasVooplePlus = false,
  pinInteractive = true,
  size = "sm",
  subscriptionExpiresAt,
  badgeUrl,
  className,
  nameClassName,
  style,
  as: Tag = "span",
}: DisplayNameWithPinProps) {
  const showPin = hasVooplePlus === true;

  return (
    <Tag className={cn("inline-flex max-w-full min-w-0 items-center gap-1", className)}>
      <span className={cn("min-w-0 truncate", nameClassName)} style={style}>
        {children}
      </span>
      {showPin ? (
        <VooplePlusPinButton
          size={size}
          expiresAt={subscriptionExpiresAt}
          badgeUrl={badgeUrl}
          interactive={pinInteractive}
        />
      ) : null}
    </Tag>
  );
}
