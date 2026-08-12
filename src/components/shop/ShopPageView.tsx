"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Package, Palette, Search, ShoppingBag } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { applyEquippedAppTheme, clearEquippedAppTheme } from "@/lib/shop/app-theme-client";
import { cn } from "@/lib/utils";
import { SectionHeaderGlow } from "@/components/layout/SectionHeaderGlow";
import { useAppTheme } from "@/components/theme/AppThemeProvider";
import type { PromoPreviewView } from "@/types/promo";
import type { ShopItemView } from "@/types/shop";
import { Button } from "@/components/ui/Button";
import { CustomizationEditor } from "@/components/customization/CustomizationEditor";
import { applyPaymentIntentResult } from "@/lib/payments/checkout-redirect";
import { DonationPanel, ShopWalletBar } from "@/components/shop/ShopWalletBar";
import { ShopCatalogSections } from "@/components/shop/ShopCatalogSections";
import { VooplePlusPanel } from "@/components/shop/VooplePlusPanel";
import { SHOP_DISPLAY_SECTIONS, type ShopDisplaySectionId } from "@/lib/shop/categories";
import { reportClientMetric } from "@/lib/telemetry/client";

export type ShopTab = "catalog" | "inventory" | "customize" | "plus";

const TABS: { id: ShopTab; label: string; icon: typeof ShoppingBag }[] = [
  { id: "catalog", label: "Каталог", icon: ShoppingBag },
  { id: "inventory", label: "Инвентарь", icon: Package },
  { id: "customize", label: "Настройка", icon: Palette },
  { id: "plus", label: "Вупл+", icon: Crown },
];

export function ShopPageView({
  initialTab = "catalog",
  loginHref = "/login",
  legalOfferHref = "/legal/offer",
  openExternal,
}: {
  initialTab?: ShopTab;
  loginHref?: string;
  legalOfferHref?: string;
  openExternal?: (url: string) => void;
}) {
  const [tab, setTab] = useState<ShopTab>(initialTab);
  const [donationMessage, setDonationMessage] = useState<string | null>(null);
  const [plusPaymentError, setPlusPaymentError] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<PromoPreviewView | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [equipMessage, setEquipMessage] = useState<string | null>(null);
  const [catalogCategory, setCatalogCategory] = useState<ShopDisplaySectionId | "all">("all");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogSort, setCatalogSort] = useState<"featured" | "new" | "name" | "price">("featured");
  const utils = trpc.useUtils();
  const { setThemeId } = useAppTheme();
  const reportedPlusView = useRef(false);

  useEffect(() => {
    if (tab !== "plus" || reportedPlusView.current) return;
    reportedPlusView.current = true;
    reportClientMetric({ name: "vooplus_offer_viewed", value: 1 });
  }, [tab]);

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
    onMutate: (variables) => {
      if (variables.kind === "subscription") {
        reportClientMetric({ name: "vooplus_checkout_started", value: 1 });
      }
    },
    onSuccess: (intent, variables) => {
      if (variables.kind === "subscription") {
        reportClientMetric({ name: "vooplus_checkout_ready", value: 1 });
        setPlusPaymentError(null);
        applyPaymentIntentResult(intent, setPlusPaymentError, openExternal);
        return;
      }
      applyPaymentIntentResult(intent, setDonationMessage, openExternal);
    },
    onError: (error, variables) => {
      const message = error.message;
      if (variables.kind === "subscription") {
        reportClientMetric({ name: "vooplus_checkout_failed", value: 1 });
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
  // Effects are retired in favour of profile-card frames. Existing records stay
  // in the database, but must not appear in catalogues or inventory UI.
  const items = useMemo(
    () => (overview?.items ?? []).filter(
      (item) => item.kind !== "effect" && item.kind !== "app_theme" && item.kind !== "nickname_style",
    ),
    [overview?.items],
  );

  const catalogItems = useMemo(() => {
    const section = SHOP_DISPLAY_SECTIONS.find((entry) => entry.id === catalogCategory);
    const query = catalogSearch.trim().toLocaleLowerCase("ru-RU");
    const filtered = items.filter((item) => {
      const matchesCategory = catalogCategory === "all" || Boolean(section?.kinds.includes(item.kind));
      const matchesSearch = !query || `${item.name} ${item.description ?? ""}`.toLocaleLowerCase("ru-RU").includes(query);
      return matchesCategory && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (catalogSort === "new") return b.id.localeCompare(a.id);
      if (catalogSort === "name") return a.name.localeCompare(b.name, "ru");
      if (catalogSort === "price") return a.priceRub - b.priceRub || a.priceCoins - b.priceCoins;
      return Number(b.equipped) - Number(a.equipped) || Number(b.owned) - Number(a.owned);
    });
  }, [catalogCategory, catalogSearch, catalogSort, items]);
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
        <a
          href={loginHref}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)] px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--foreground)_15%,transparent)]"
        >
          Войти
        </a>
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
    <div className="shop-page space-y-6">
      <header className="shop-toolbar voople-sticky-section-header">
        <SectionHeaderGlow />
        <div className="flex min-w-0 items-center gap-3">
          <span className="shop-toolbar__mark" aria-hidden>
            <ShoppingBag className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">Магазин Вупл.</h1>
            <p className="hidden text-xs text-[var(--app-muted)] sm:block">Оформление профиля и приложения</p>
          </div>
        </div>
        <nav className="shop-tabs" aria-label="Разделы магазина">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cn("shop-tab", tab === id && "shop-tab--active")}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <ShopWalletBar wallet={overview.wallet} compact />
      </header>

      {equipMessage ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {equipMessage}
        </p>
      ) : null}

      {tab === "plus" && (
        <VooplePlusPanel
          status={subscriptionQuery.data}
          statusLoading={subscriptionQuery.isLoading}
          paymentPending={createPayment.isPending}
          paymentError={plusPaymentError}
          promoPending={applyPromo.isPending}
          promoMessage={promoMessage}
          promoDiscount={promoDiscount}
          onApplyPromo={(code, subscriptionPlan) => {
            setPromoMessage(null);
            applyPromo.mutate({ code, subscriptionPlan });
          }}
          onSubscribe={(subscriptionPlan, promoCode) => {
            setPlusPaymentError(null);
            createPayment.mutate({
              kind: "subscription",
              promoCode: promoCode || undefined,
              subscriptionPlan,
            });
          }}
          legalOfferHref={legalOfferHref}
          onOpenLegalOffer={openExternal}
        />
      )}

      {tab === "catalog" && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">Найдите свой стиль</h2>
              <p className="mt-1 text-sm text-[var(--app-muted)]">Украшения, баннеры и рамки для профиля Вупл.</p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <label className="shop-search">
                <Search className="h-4 w-4" aria-hidden />
                <input
                  value={catalogSearch}
                  onChange={(event) => setCatalogSearch(event.target.value)}
                  placeholder="Поиск по магазину"
                />
              </label>
              <select
                value={catalogSort}
                onChange={(event) => setCatalogSort(event.target.value as typeof catalogSort)}
                className="shop-sort"
                aria-label="Сортировка товаров"
              >
                <option value="featured">Для вас</option>
                <option value="new">Сначала новые</option>
                <option value="name">По названию</option>
                <option value="price">По цене</option>
              </select>
            </div>
          </div>
          <div className="shop-category-viewport">
            <div className="shop-categories">
              <button type="button" onClick={() => setCatalogCategory("all")} className={cn("shop-category", catalogCategory === "all" && "shop-category--active")}>Все товары</button>
              {SHOP_DISPLAY_SECTIONS.filter((section) => items.some((item) => section.kinds.includes(item.kind))).map((section) => (
                <button key={section.id} type="button" onClick={() => setCatalogCategory(section.id)} className={cn("shop-category", catalogCategory === section.id && "shop-category--active")}>{section.title}</button>
              ))}
            </div>
          </div>
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
            hasSubscription={Boolean(subscriptionQuery.data?.active)}
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
              hasSubscription={Boolean(subscriptionQuery.data?.active)}
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
