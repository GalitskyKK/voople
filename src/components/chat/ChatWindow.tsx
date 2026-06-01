"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { trpc } from "@/lib/trpc/client";
import type { ChatMessageView } from "@/server/services/chat.service";
import { Button } from "@/components/ui/Button";
import { MessageBubble } from "./MessageBubble";

type ChatWindowProps = {
  chatId: string;
};

function createOptimisticMessage(id: string, text: string): ChatMessageView {
  return {
    id,
    senderId: "me",
    text,
    createdAt: new Date().toISOString(),
    isMine: true,
  };
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: me } = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  const { realtimeDegraded } = useRealtimeChat(chatId, me?.id);

  const { data, isLoading, error } = trpc.chat.getMessages.useQuery(
    { chatId },
    {
      staleTime: 5_000,
      refetchOnWindowFocus: false,
      refetchInterval: realtimeDegraded ? 2_500 : false,
    },
  );

  const send = trpc.chat.send.useMutation({
    onMutate: async (input) => {
      const trimmed = input.text.trim();
      await utils.chat.getMessages.cancel({ chatId });
      const prev = utils.chat.getMessages.getData({ chatId });
      const optimistic = createOptimisticMessage(input.messageId, trimmed);
      utils.chat.getMessages.setData({ chatId }, (current) =>
        current?.messages.some((message) => message.id === optimistic.id)
          ? current
          : current
            ? { ...current, messages: [...current.messages, optimistic] }
            : { messages: [optimistic], otherUser: null },
      );
      setText("");
      return { prev };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) {
        utils.chat.getMessages.setData({ chatId }, ctx.prev);
      }
    },
    onSuccess: (msg) => {
      utils.chat.getMessages.setData({ chatId }, (current) => {
        if (!current) return current;
        const messages = current.messages.map((m) => (m.id === msg.id ? msg : m));
        if (messages.some((m) => m.id === msg.id)) return { ...current, messages };
        return { ...current, messages: [...messages, msg] };
      });
      void utils.chat.list.invalidate();
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    send.mutate({ chatId, messageId: crypto.randomUUID(), text: trimmed });
  };

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-white/5" />;
  }

  if (error) {
    return <p className="text-sm text-red-400">{error.message}</p>;
  }

  const other = data?.otherUser;

  return (
    <div className="voople-chat-window flex h-[calc(100dvh-8rem)] flex-col">
      <header className="mb-4 flex items-center gap-3 border-b border-white/10 pb-3">
        <Link href="/messages" className="text-white/60 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="truncate font-semibold">{other?.displayName ?? "Чат"}</p>
          {other && (
            <Link href={`/${other.username}`} className="text-sm text-[#7B3AED] hover:underline">
              @{other.username}
            </Link>
          )}
        </div>
      </header>

      <div className="voople-chat-window__messages voople-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {data?.messages.length === 0 && (
          <p className="text-center text-sm text-white/40">Напишите первое сообщение</p>
        )}
        {data?.messages.map((m) => (
          <MessageBubble key={m.id} text={m.text ?? ""} isMine={m.isMine} />
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        className="mt-3 flex gap-2 border-t border-white/10 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Сообщение…"
          maxLength={1000}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#7B3AED]/50"
        />
        <Button type="submit" variant="primary" disabled={!text.trim()}>
          →
        </Button>
      </form>
    </div>
  );
}
