import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  text: string;
  isMine: boolean;
};

export function MessageBubble({ text, isMine }: MessageBubbleProps) {
  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <p
        className={cn(
          "voople-message-bubble max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
          isMine
            ? "rounded-br-md bg-[var(--theme-accent)] text-white"
            : "rounded-bl-md bg-white/10 text-white/90",
        )}
      >
        {text}
      </p>
    </div>
  );
}
