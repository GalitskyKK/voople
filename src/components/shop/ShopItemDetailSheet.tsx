"use client";

import { Eye, Sparkles } from "lucide-react";
import { useEffect } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { shopKindLabel } from "@/lib/shop/categories";
import type { ShopItemView } from "@/types/shop";
import { reportProductEvent } from "@/lib/telemetry/client";

import { ShopCatalogPreview } from "./ShopCatalogPreview";

const CONTEXT_LABELS: Partial<Record<ShopItemView["kind"], string>> = {
  decoration: "Так украшение выглядит на аватаре в профиле, чате и комнате.",
  ring: "Так кольцо выглядит на аватаре в профиле, чате и комнате.",
  banner: "Так баннер выглядит внутри identity-карточки профиля.",
  profile_background: "Фон применяется только к identity surface и не затрагивает ленту.",
  profile_frame: "Рамка окружает карточку профиля, не меняя её сетку.",
  feed_card: "Оформление применяется к области автора, а не ко всему посту.",
};

export function ShopItemDetailSheet({ item, open, onClose }: { item: ShopItemView; open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (open) reportProductEvent("item_viewed", { itemKind: item.kind, surface: "store_detail" });
  }, [item.kind, open]);
  return (
    <Sheet open={open} onClose={onClose} className="max-w-2xl" ariaLabel={`Предпросмотр товара ${item.name}`}>
      <div className="flex items-start gap-3 pr-10">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--app-accent-soft)] text-[var(--theme-accent)]"><Sparkles className="h-5 w-5" /></span>
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--theme-accent)]">{shopKindLabel(item.kind)}</p><h2 className="mt-1 text-xl font-semibold">{item.name}</h2></div>
      </div>
      <div className="mt-5 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-black/25 shadow-[var(--app-shadow-md)]">
        <div className="aspect-[4/3]"><ShopCatalogPreview catalog={item.previewMeta} previewUrl={item.previewUrl} /></div>
      </div>
      <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><Eye className="h-4 w-4 text-[var(--theme-accent)]" />В контексте Voople</p>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{CONTEXT_LABELS[item.kind] ?? "Предпросмотр показывает предмет в том интерфейсе, где он будет использоваться."}</p>
        {item.description ? <p className="mt-3 border-t border-[var(--app-border)] pt-3 text-sm leading-6">{item.description}</p> : null}
      </div>
      <p className="mt-4 text-xs text-[var(--app-muted)]">Покупка, подарок и выбор состояния остаются на карточке товара — предпросмотр не выполняет действие автоматически.</p>
    </Sheet>
  );
}
