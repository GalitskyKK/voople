import { ChatWindow } from "@/components/chat/ChatWindow";

type PageProps = {
  params: Promise<{ chatId: string }>;
};

export default async function ChatPage({ params }: PageProps) {
  const { chatId } = await params;
  return <ChatWindow chatId={chatId} />;
}
