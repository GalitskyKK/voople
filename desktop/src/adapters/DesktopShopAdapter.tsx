import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";

import { AppPageContent } from "@/components/layout/AppPageContent";
import { ShopPageFrame } from "@/components/shop/ShopPageFrame";
import { ShopPageView } from "@/components/shop/ShopPageView";

import type { DesktopConfig } from "../config";

/** Desktop external-navigation adapter around the canonical shop presentation. */
export function DesktopShopAdapter({ config }: { config: DesktopConfig }) {
  const [openError, setOpenError] = useState<string | null>(null);
  const openExternal = useCallback((url: string) => {
    setOpenError(null);
    void invoke("open_external_url", { url }).catch((error: unknown) => {
      setOpenError(error instanceof Error ? error.message : "Не удалось открыть браузер");
    });
  }, []);

  return (
    <AppPageContent>
      <ShopPageFrame>
        {openError ? <p className="form-error mb-3" role="alert">{openError}</p> : null}
        <ShopPageView
          legalOfferHref={`${config.apiUrl}/legal/offer`}
          openExternal={openExternal}
        />
      </ShopPageFrame>
    </AppPageContent>
  );
}
