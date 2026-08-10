import type { ReactNode } from "react";

import { AppPanelHeader } from "@/components/layout/AppPanelHeader";

export function ChatWindowHeaderVisual({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <AppPanelHeader className={`voople-chat-window__header ${className ?? ""}`}>
      {children}
    </AppPanelHeader>
  );
}
