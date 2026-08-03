import { MessagesLayout } from "@/components/chat/MessagesLayout";
import { SectionFrame } from "@/components/layout/SectionFrame";

export function MessagesSection({ children }: { children: React.ReactNode }) {
  return (
    <SectionFrame
      wide
      className="min-h-0 max-w-none flex-1 py-0"
    >
      <MessagesLayout>{children}</MessagesLayout>
    </SectionFrame>
  );
}
