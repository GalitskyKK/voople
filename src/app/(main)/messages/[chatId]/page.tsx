import { ChatWindow } from "@/components/chat/ChatWindow";

type PageProps = {
  params: Promise<{ chatId: string }>;
};

export default async function ChatPage({ params }: PageProps) {
  const { chatId } = await params;
  return (
    <div className="voople-chat-page mx-auto max-w-xl px-4 py-6">
      <ChatWindow chatId={chatId} />
    </div>
  );
}
