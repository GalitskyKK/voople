import { ChatWindow } from "@/components/chat/ChatWindow";

type PageProps = {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<{ surface?: string | string[] }>;
};

export default async function ChatPage({ params, searchParams }: PageProps) {
  const [{ chatId }, query] = await Promise.all([params, searchParams]);
  const requestedSurface = Array.isArray(query.surface) ? query.surface[0] : query.surface;
  const initialGroupTab = requestedSurface === "chat" || requestedSurface === "people"
    ? requestedSurface
    : "now";
  return <ChatWindow chatId={chatId} initialGroupTab={initialGroupTab} />;
}
