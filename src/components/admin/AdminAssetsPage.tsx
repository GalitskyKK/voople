"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { AdminAssetEditor } from "@/components/admin/AdminAssetEditor";
import { ShopCatalogPreview } from "@/components/shop/ShopCatalogPreview";
import { shopKindLabel } from "@/lib/shop/categories";
import { customizationAssetPath } from "@/lib/customization/asset-path";
import { usesAssetPack } from "@/lib/shop/asset-packs";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { AdminShopItemRecord } from "@/types/admin-shop";
import { Button } from "@/components/ui/Button";

function previewUrlForItem(item: AdminShopItemRecord): string | null {
  if (item.previewUrl) return item.previewUrl;
  if (!item.assetFolder || !item.assetId) return null;
  return customizationAssetPath(item.assetFolder, item.assetId);
}

export function AdminAssetsPage() {
  const utils = trpc.useUtils();
  const itemsQuery = trpc.admin.shopItems.useQuery();
  const deleteMutation = trpc.admin.deleteShopItem.useMutation({
    onSuccess: () => utils.admin.shopItems.invalidate(),
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminShopItemRecord | null>(null);

  const items = itemsQuery.data ?? [];
  const grouped = useMemo(() => {
    const map = new Map<string, AdminShopItemRecord[]>();
    for (const item of items) {
      const key = item.kind;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (item: AdminShopItemRecord) => {
    setEditing(item);
    setEditorOpen(true);
  };

  const handleDelete = async (item: AdminShopItemRecord) => {
    const ok = window.confirm(`Удалить «${item.name}» (${item.id})?`);
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync({ itemId: item.id });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Не удалось удалить");
    }
  };

  if (itemsQuery.isLoading) {
    return <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_55%,transparent)]">Загрузка…</p>;
  }

  if (itemsQuery.error) {
    return (
      <p className="text-sm text-red-400">
        {itemsQuery.error.message}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_55%,transparent)]">
          {items.length} предметов · источник правды — БД + CDN
        </p>
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Добавить ассет
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--app-border)] p-10 text-center">
          <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_55%,transparent)]">
            Каталог пуст. Добавьте первый предмет или прогоните seed из catalog.ts.
          </p>
        </div>
      ) : (
        grouped.map(([kind, kindItems]) => (
          <section key={kind} className="space-y-3">
            <h2 className="text-base font-semibold">{shopKindLabel(kind as AdminShopItemRecord["kind"])}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {kindItems.map((item) => {
                const previewUrl = previewUrlForItem(item);
                const previewMeta = {
                  kind: item.kind,
                  name: item.name,
                  assetFolder: item.assetFolder ?? undefined,
                  assetId: item.assetId ?? undefined,
                  equipValue: item.equipValue ?? undefined,
                };

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)]"
                  >
                    <div className="relative aspect-[4/3] bg-black/30">
                      <ShopCatalogPreview catalog={previewMeta} previewUrl={previewUrl} />
                    </div>
                    <div className="space-y-2 p-3">
                      <div>
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-xs text-[color-mix(in_srgb,var(--foreground)_45%,transparent)]">{item.id}</p>
                      </div>
                      <p className="line-clamp-2 text-sm text-[color-mix(in_srgb,var(--foreground)_65%,transparent)]">
                        {item.description || "—"}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">
                        <span>{item.isFree ? "бесплатно" : `${item.priceCoins} voops / ${item.priceRub} ₽`}</span>
                        {item.assetFolder && item.assetId ? (
                          usesAssetPack(item.kind) ? (
                            <span className="truncate">video: {item.equipValue ?? item.assetId}</span>
                          ) : (
                            <span className="truncate">{item.assetFolder}/{item.assetId}</span>
                          )
                        ) : (
                          <span>CSS · {item.equipValue ?? "—"}</span>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Изменить
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDelete(item)}
                          className={cn(deleteMutation.isPending && "opacity-50")}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}

      <AdminAssetEditor
        open={editorOpen}
        item={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false);
          void utils.admin.shopItems.invalidate();
        }}
      />
    </div>
  );
}
