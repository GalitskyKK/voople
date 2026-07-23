"use client";

import { usePathname } from "next/navigation";

import { MessagesLayout } from "@/components/chat/MessagesLayout";
import { SectionFrame } from "@/components/layout/SectionFrame";
import { isMessagesThreadPath } from "@/lib/layout/messages-path";
import { cn } from "@/lib/utils";

export function MessagesSection({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isThread = isMessagesThreadPath(pathname);

  return (
    <SectionFrame
      wide
      className={cn("min-h-0 flex-1", isThread ? "py-0" : "py-4 lg:py-0")}
    >
      <MessagesLayout>{children}</MessagesLayout>
    </SectionFrame>
  );
}
