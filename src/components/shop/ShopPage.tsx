"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Crown, Package, Palette, ShoppingBag } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { applyEquippedAppTheme, clearEquippedAppTheme } from "@/lib/shop/app-theme-client";
import { cn } from "@/lib/utils";
import { useAppTheme } from "@/components/theme/AppThemeProvider";
import type { PromoPreviewView } from "@/types/promo";
import type { ShopItemView } from "@/types/shop";
import { Button } from "@/components/ui/Button";
import { CustomizationEditor } from "@/components/customization/CustomizationEditor";
import { applyPaymentIntentResult } from "@/lib/payments/checkout-redirect";
import { DonationPanel, ShopWalletBar } from "@/components/shop/ShopWalletBar";
import { ShopCatalogSections } from "@/components/shop/ShopCatalogSections";
import { VooplePlusPanel } from "@/components/shop/VooplePlusPanel";

type ShopTab = "catalog" | "inventory" | "customize" | "plus";

const TABS: { id: ShopTab; label: string; icon: typeof ShoppingBag }[] = [
  { id: "plus", label: "Voople+", icon: Crown },
  { id: "catalog", label: "Каталог", icon: ShoppingBag },
  { id: "inventory", label: "Инвентарь", icon: Package },
  { id: "customize", label: "Настройка", icon: Palette },
];

const TAB_IDS = new Set<ShopTab>(["catalog", "inventory", "customize", "plus"]);

export function ShopPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const initialTab: ShopTab =
    tabFromUrl && TAB_IDS.has(tabFromUrl as ShopTab) ? (tabFromUrl as ShopTab) : "catalog";
  const [tab, setTab] = useState<ShopTab>(initialTab);
  const [donationMessage, setDonationMessage] = useState<string | null>(null);
  const [plusPaymentError, setPlusPaymentError] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<PromoPreviewView | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [equipMessage, setEquipMessage] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const { setThemeId } = useAppTheme();

  // Синхронизация активной вкладки с ?tab=... во время рендера (без эффекта).
  const [prevTabFromUrl, setPrevTabFromUrl] = useState(tabFromUrl);
  if (tabFromUrl !== prevTabFromUrl) {
    setPrevTabFromUrl(tabFromUrl);
    if (tabFromUrl && TAB_IDS.has(tabFromUrl as ShopTab)) {
      setTab(tabFromUrl as ShopTab);
    }
  }

  const overviewQuery = trpc.shop.overview.useQuery(undefined, {
    retry: false,
  });

  const subscriptionQuery = trpc.shop.subscriptionStatus.useQuery(undefined, {
    retry: false,
    enabled: overviewQuery.isSuccess,
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

  const applyPromo = trpc.shop.applyPromo.useMutation({
    onSuccess: (data) => {
      setPromoMessage(null);
      setPromoDiscount(null);
      if (data.action === "discount") {
        setPromoDiscount(data.preview);
        setPromoMessage(data.preview.message);
        return;
      }
      setPromoMessage(data.result.message);
      if (data.subscription) {
        void utils.shop.subscriptionStatus.invalidate();
      }
      if (data.overview) {
        utils.shop.overview.setData(undefined, data.overview);
      }
    },
    onError: (error) => {
      setPromoMessage(error.message);
      setPromoDiscount(null);
    },
  });

  const createPayment = trpc.shop.createPaymentIntent.useMutation({
    onSuccess: (intent, variables) => {
      if (variables.kind === "subscription") {
        setPlusPaymentError(null);
        applyPaymentIntentResult(intent, setPlusPaymentError);
        return;
      }
      applyPaymentIntentResult(intent, setDonationMessage);
    },
    onError: (error, variables) => {
      const message = error.message;
      if (variables.kind === "subscription") {
        setPlusPaymentError(message);
      } else {
        setDonationMessage(message);
      }
    },
  });

  const equip = trpc.customization.equip.useMutation({
    onSuccess: async (equipped) => {
      setEquipMessage(null);
      applyEquippedAppTheme(setThemeId, equipped.appThemeId);
      await utils.shop.overview.invalidate();
      await utils.customization.getEquipped.invalidate();
    },
    onError: (error) => {
      setEquipMessage(error.message);
    },
  });

  const clearSlot = trpc.customization.clearSlot.useMutation({
    onSuccess: async (equipped, variables) => {
      if (variables.slot === "app_theme_id") {
        clearEquippedAppTheme(setThemeId);
      }
      await utils.shop.overview.invalidate();
      await utils.customization.getEquipped.invalidate();
    },
  });

  const busy =
    claimFree.isPending ||
    claimAllFree.isPending ||
    purchaseCoins.isPending ||
    createPayment.isPending ||
    applyPromo.isPending ||
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
    return <p className="text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">Загрузка магазина…</p>;
  }

  if (overviewQuery.error) {
    return (
      <div className="voople-panel p-6 text-center">
        <p className="text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">Войдите, чтобы открыть магазин и кастомизацию.</p>
        <Link
          href="/login"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--foreground)_15%,transparent)]"
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

      {equipMessage ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {equipMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition",
              tab === id ? "bg-[color-mix(in_srgb,var(--foreground)_15%,transparent)] text-[var(--foreground)]" : "bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] text-[color-mix(in_srgb,var(--foreground)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === "plus" && (
        <VooplePlusPanel
          status={subscriptionQuery.data}
          statusLoading={subscriptionQuery.isLoading}
          paymentPending={createPayment.isPending}
          paymentError={plusPaymentError}
          promoPending={applyPromo.isPending}
          promoMessage={promoMessage}
          promoDiscount={promoDiscount}
          onApplyPromo={(code) => {
            setPromoMessage(null);
            applyPromo.mutate({ code });
          }}
          onSubscribe={(promoCode) => {
            setPlusPaymentError(null);
            createPayment.mutate({
              kind: "subscription",
              promoCode: promoCode || undefined,
            });
          }}
        />
      )}

      {tab === "catalog" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_55%,transparent)]">
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
          <ShopCatalogSections
            items={catalogItems}
            busy={busy}
            onClaimFree={(itemId) => claimFree.mutate({ itemId })}
            onBuyCoins={(itemId) => purchaseCoins.mutate({ itemId })}
            onBuyRub={(itemId) => createPayment.mutate({ kind: "shop_item", itemId })}
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
            <p className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] p-8 text-center text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">
              Инвентарь пуст. Загляни в каталог и забирай предметы.
            </p>
          ) : (
            <ShopCatalogSections
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
          isPlus={Boolean(subscriptionQuery.data?.active)}
          onEquip={(itemId) => equip.mutate({ itemId })}
          onClearSlot={(slot) => clearSlot.mutate({ slot })}
          busy={busy}
        />
      )}
    </div>
  );
}
