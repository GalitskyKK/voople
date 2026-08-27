"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { Tooltip } from "./Tooltip";

export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
    label: string;
    children: ReactNode;
    tooltipSide?: "top" | "right" | "bottom" | "left";
    tooltipClassName?: string;
  }
>(function IconButton(
  {
    label,
    children,
    tooltipSide = "top",
    tooltipClassName,
    disabled,
    ...buttonProps
  },
  ref,
) {
  return (
    <Tooltip
      label={label}
      side={tooltipSide}
      className={tooltipClassName}
    >
      <button ref={ref} type="button" aria-label={label} disabled={disabled} {...buttonProps}>
        {children}
      </button>
    </Tooltip>
  );
});
