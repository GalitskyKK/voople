import type { ChatMessageContentNode } from "@/types/chat";

export function ChatMessageContent({ nodes, fallback }: { nodes: ChatMessageContentNode[] | null | undefined; fallback: string }) {
  if (!nodes?.length) return <>{fallback}</>;
  return <>{nodes.map((node, index) => node.type === "text" ? (
    <span key={`text-${index}`}>{node.text}</span>
  ) : node.url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={`${node.emojiId}-${index}`}
      src={node.url}
      alt={`:${node.name}:`}
      title={`:${node.name}:`}
      className="mx-0.5 inline-block h-[1.55em] w-[1.55em] object-contain align-[-0.35em]"
      loading="lazy"
    />
  ) : (
    <span key={`${node.emojiId}-${index}`}>:{node.name}:</span>
  ))}</>;
}
