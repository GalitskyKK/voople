"use client";

import { useSearchParams } from "next/navigation";

import { ShopPageView, type ShopTab } from "./ShopPageView";

const SHOP_TABS = new Set<ShopTab>(["catalog", "inventory", "customize", "plus"]);

export function ShopPage() {
  const value = useSearchParams().get("tab");
  const initialTab = value && SHOP_TABS.has(value as ShopTab)
    ? (value as ShopTab)
    : "catalog";

  return <ShopPageView key={initialTab} initialTab={initialTab} />;
}
