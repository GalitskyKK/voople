"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

import { navigateInternally } from "@/lib/platform/internal-navigation";

export function AppInternalLink({
  href,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target === "_blank"
    ) {
      return;
    }
    if (navigateInternally(href)) event.preventDefault();
  };

  return <a {...props} href={href} onClick={handleClick} />;
}
