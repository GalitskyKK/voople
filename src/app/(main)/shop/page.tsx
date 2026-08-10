import type { Metadata } from "next";

import { ShopPage } from "@/components/shop/ShopPage";
import { ShopPageFrame } from "@/components/shop/ShopPageFrame";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Магазин оформления",
  description: "Украшения аватара, рамки профиля, бейджики и темы для профиля Voople.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Магазин оформления Voople",
    description: "Соберите свой образ: украшения аватара, рамки профиля, бейджики и темы.",
    url: "/shop",
  },
};

export default function ShopRoutePage() {
  return (
    <ShopPageFrame>
      <ShopPage />
    </ShopPageFrame>
  );
}
