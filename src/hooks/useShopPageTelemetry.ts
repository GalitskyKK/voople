import { useEffect, useRef } from "react";

import { reportClientMetric, reportProductEvent } from "@/lib/telemetry/client";

export function useShopPageTelemetry(tab: "catalog" | "inventory" | "customize" | "plus") {
  const reportedPlusView = useRef(false);
  useEffect(() => reportProductEvent("store_opened", { surface: "store" }), []);
  useEffect(() => {
    if (tab !== "plus" || reportedPlusView.current) return;
    reportedPlusView.current = true;
    reportClientMetric({ name: "vooplus_offer_viewed", value: 1 });
    reportProductEvent("plus_viewed", { surface: "store" });
  }, [tab]);
}
