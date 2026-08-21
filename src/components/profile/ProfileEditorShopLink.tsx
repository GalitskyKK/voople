"use client";

import { AppInternalLink } from "@/components/ui/AppInternalLink";

const SHOP_HREF = "/shop?tab=catalog";

export function ProfileEditorShopLink({
  onNavigate,
  onBeforeNavigate,
}: {
  onNavigate?: (href: string) => void;
  onBeforeNavigate: () => void;
}) {
  if (!onNavigate) {
    return (
      <AppInternalLink
        href={SHOP_HREF}
        className="profile-editor-shop-link"
        onClick={onBeforeNavigate}
      >
        Открыть магазин
      </AppInternalLink>
    );
  }

  return (
    <button
      type="button"
      className="profile-editor-shop-link"
      onClick={() => {
        onBeforeNavigate();
        onNavigate(SHOP_HREF);
      }}
    >
      Открыть магазин
    </button>
  );
}
