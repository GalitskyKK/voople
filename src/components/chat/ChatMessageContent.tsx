import type { ChatMessageContentNode } from "@/types/chat";
import { RichText } from "@/components/ui/RichText";
import { Clock3, Gift, PhoneCall, PhoneMissed } from "lucide-react";
import { formatRoomDuration } from "@/lib/chat/message-content";

export function ChatMessageContent({ nodes, fallback }: { nodes: ChatMessageContentNode[] | null | undefined; fallback: string }) {
  if (!nodes?.length) return <RichText text={fallback} />;
  return <>{nodes.map((node, index) => node.type === "text" ? (
    <RichText key={`text-${index}`} text={node.text} />
  ) : node.type === "roomEvent" ? (
    <span key={`room-${node.event}-${index}`} className="inline-flex items-center gap-1.5">
      {node.event === "missed" || node.event === "declined" || node.event === "cancelled" ? <PhoneMissed className="h-3.5 w-3.5" /> : node.event === "ended" ? <Clock3 className="h-3.5 w-3.5" /> : <PhoneCall className="h-3.5 w-3.5" />}
      {node.event === "started" ? node.roomKind === "group" ? "Комната открыта" : "Начат звонок" : node.event === "missed" ? "Пропущенный звонок" : node.event === "declined" ? "Звонок отклонён" : node.event === "cancelled" ? "Звонок отменён" : `Встреча завершена${node.durationSeconds === null ? "" : ` · ${formatRoomDuration(node.durationSeconds)}`}`}
    </span>
  ) : node.type === "gift" ? (
    <span key={`gift-${node.itemId}-${index}`} className="my-1 flex min-w-52 items-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--theme-accent)_35%,var(--app-border))] bg-[var(--app-accent-soft)] p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--theme-accent)] text-white"><Gift className="h-5 w-5" /></span>
      <span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--theme-accent)]">Подарок</span><span className="block truncate text-sm font-semibold">{node.itemName}</span>{node.message ? <span className="mt-0.5 block text-xs opacity-75"><RichText text={node.message} /></span> : null}</span>
    </span>
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
