import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";

import { ShopPageView } from "@/components/shop/ShopPageView";

import type { DesktopConfig } from "../config";

export function DesktopShop({ config }: { config: DesktopConfig }) {
  const [openError, setOpenError] = useState<string | null>(null);
  const openExternal = useCallback((url: string) => {
    setOpenError(null);
    void invoke("open_external_url", { url }).catch((error: unknown) => {
      setOpenError(error instanceof Error ? error.message : "Не удалось открыть браузер");
    });
  }, []);

  return (
    <section className="desktop-section-content">
      {openError ? <p className="form-error mb-3" role="alert">{openError}</p> : null}
      <ShopPageView
        legalOfferHref={`${config.apiUrl}/legal/offer`}
        openExternal={openExternal}
      />
    </section>
  );
}
