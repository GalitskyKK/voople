"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FeedHeaderVisual } from "@/components/layout/FeedHeaderVisual";
import type { FeedTabId } from "@/lib/constants/copy";

export function FeedHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as FeedTabId) || "overview";

  if (pathname !== "/feed") return null;

  const setTab = (tab: FeedTabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/feed?${params.toString()}`, { scroll: false });
  };

  return <FeedHeaderVisual activeTab={activeTab} onTabChange={setTab} />;
}
