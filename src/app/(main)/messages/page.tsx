"use client";

import { ChatList } from "@/components/chat/ChatList";

export default function MessagesPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Сообщения</h1>
      <ChatList />
    </div>
  );
}
