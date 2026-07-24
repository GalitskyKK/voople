import type { Metadata } from "next";

import { ShopPage } from "@/components/shop/ShopPage";

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
    <div className="mx-auto w-full px-1 py-4 sm:px-3 lg:px-5 lg:py-5">
      <ShopPage />
    </div>
  );
}
