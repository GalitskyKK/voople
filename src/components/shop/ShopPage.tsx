"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Package, Palette, ShoppingBag } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import type { ShopItemView } from "@/types/shop";
import { Button } from "@/components/ui/Button";
import { CustomizationEditor } from "@/components/customization/CustomizationEditor";
import { DonationPanel, ShopWalletBar } from "@/components/shop/ShopWalletBar";
import { ShopItemCard } from "@/components/shop/ShopItemCard";

type ShopTab = "catalog" | "inventory" | "customize";

const TABS: { id: ShopTab; label: string; icon: typeof ShoppingBag }[] = [
  { id: "catalog", label: "Каталог", icon: ShoppingBag },
  { id: "inventory", label: "Инвентарь", icon: Package },
  { id: "customize", label: "Настройка", icon: Palette },
];

export function ShopPage() {
  const [tab, setTab] = useState<ShopTab>("catalog");
  const [donationMessage, setDonationMessage] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const overviewQuery = trpc.shop.overview.useQuery(undefined, {
    retry: false,
  });

  const claimFree = trpc.shop.claimFree.useMutation({
    onSuccess: (data) => {
      utils.shop.overview.setData(undefined, data);
    },
  });

  const claimAllFree = trpc.shop.claimAllFree.useMutation({
    onSuccess: (data) => {
      utils.shop.overview.setData(undefined, data);
    },
  });

  const purchaseCoins = trpc.shop.purchaseWithCoins.useMutation({
    onSuccess: (data) => {
      utils.shop.overview.setData(undefined, data);
    },
  });

  const createPayment = trpc.shop.createPaymentIntent.useMutation({
    onSuccess: (intent) => {
      setDonationMessage(intent.message);
    },
  });

  const equip = trpc.customization.equip.useMutation({
    onSuccess: async () => {
      await utils.shop.overview.invalidate();
      await utils.customization.getEquipped.invalidate();
    },
  });

  const clearSlot = trpc.customization.clearSlot.useMutation({
    onSuccess: async () => {
      await utils.shop.overview.invalidate();
      await utils.customization.getEquipped.invalidate();
    },
  });

  const busy =
    claimFree.isPending ||
    claimAllFree.isPending ||
    purchaseCoins.isPending ||
    createPayment.isPending ||
    equip.isPending ||
    clearSlot.isPending;

  const overview = overviewQuery.data;
  const items = useMemo(() => overview?.items ?? [], [overview?.items]);

  const catalogItems = items;
  const inventoryItems = useMemo(
    () => items.filter((item) => item.owned),
    [items],
  );

  if (overviewQuery.isLoading) {
    return <p className="text-white/50">Загрузка магазина…</p>;
  }

  if (overviewQuery.error) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-white/70">Войдите, чтобы открыть магазин и кастомизацию.</p>
        <Link
          href="/login"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-white/10 px-4 text-sm font-medium text-white hover:bg-white/15"
        >
          Войти
        </Link>
      </div>
    );
  }

  if (!overview) return null;

  const handleEquip = (item: ShopItemView) => {
    equip.mutate({ itemId: item.id });
  };

  const handleUnequip = (item: ShopItemView) => {
    clearSlot.mutate({ slot: item.equipSlot });
  };

  return (
    <div className="space-y-6">
      <ShopWalletBar wallet={overview.wallet} />

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition",
              tab === id ? "bg-white/15 text-white" : "bg-white/5 text-white/60 hover:bg-white/10",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === "catalog" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/55">
              Сейчас весь сезон Launch можно забрать бесплатно. Voops копятся на будущие покупки.
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy || inventoryItems.length === items.length}
              onClick={() => claimAllFree.mutate()}
            >
              Забрать всё бесплатное
            </Button>
          </div>
          <ItemGrid
            items={catalogItems}
            busy={busy}
            onClaimFree={(itemId) => claimFree.mutate({ itemId })}
            onBuyCoins={(itemId) => purchaseCoins.mutate({ itemId })}
            onBuyRub={(itemId, priceRub) =>
              createPayment.mutate({ kind: "shop_item", amountRub: priceRub, itemId })
            }
            onEquip={handleEquip}
            onUnequip={handleUnequip}
          />
          <DonationPanel
            pending={createPayment.isPending}
            message={donationMessage}
            onDonate={(amountRub) => {
              setDonationMessage(null);
              createPayment.mutate({ kind: "donation", amountRub });
            }}
          />
        </section>
      )}

      {tab === "inventory" && (
        <section className="space-y-4">
          {inventoryItems.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/50">
              Инвентарь пуст. Загляни в каталог и забирай предметы.
            </p>
          ) : (
            <ItemGrid
              items={inventoryItems}
              busy={busy}
              onEquip={handleEquip}
              onUnequip={handleUnequip}
            />
          )}
        </section>
      )}

      {tab === "customize" && (
        <CustomizationEditor
          items={inventoryItems}
          equipped={overview.equipped}
          onEquip={(itemId) => equip.mutate({ itemId })}
          onClearSlot={(slot) => clearSlot.mutate({ slot })}
          busy={busy}
        />
      )}
    </div>
  );
}

type ItemGridProps = {
  items: ShopItemView[];
  busy?: boolean;
  onClaimFree?: (itemId: string) => void;
  onBuyCoins?: (itemId: string) => void;
  onBuyRub?: (itemId: string, priceRub: number) => void;
  onEquip?: (item: ShopItemView) => void;
  onUnequip?: (item: ShopItemView) => void;
};

function ItemGrid({
  items,
  busy,
  onClaimFree,
  onBuyCoins,
  onBuyRub,
  onEquip,
  onUnequip,
}: ItemGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <ShopItemCard
          key={item.id}
          item={item}
          busy={busy}
          onClaimFree={onClaimFree ? () => onClaimFree(item.id) : undefined}
          onBuyCoins={onBuyCoins ? () => onBuyCoins(item.id) : undefined}
          onBuyRub={onBuyRub ? () => onBuyRub(item.id, item.priceRub) : undefined}
          onEquip={onEquip ? () => onEquip(item) : undefined}
          onUnequip={onUnequip ? () => onUnequip(item) : undefined}
        />
      ))}
    </div>
  );
}
