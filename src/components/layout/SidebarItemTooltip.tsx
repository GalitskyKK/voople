import type { ReactNode } from "react";

import { Tooltip } from "@/components/ui/Tooltip";

export function SidebarItemTooltip({
  label,
  enabled,
  children,
  className,
}: {
  label: string;
  enabled: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tooltip label={label} side="right" disabled={!enabled} className={className}>
      {children}
    </Tooltip>
  );
}
