"use client";

import { AppInternalLink } from "@/components/ui/AppInternalLink";

const SHOP_HREF = "/shop?tab=catalog";

export function ProfileEditorShopLink({
  onNavigate,
  onBeforeNavigate,
}: {
  onNavigate?: (href: string) => void;
  onBeforeNavigate: () => boolean | void;
}) {
  if (!onNavigate) {
    return (
      <AppInternalLink
        href={SHOP_HREF}
        className="profile-editor-shop-link"
        onClick={(event) => {
          if (onBeforeNavigate() === false) event.preventDefault();
        }}
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
        if (onBeforeNavigate() === false) return;
        onNavigate(SHOP_HREF);
      }}
    >
      Открыть магазин
    </button>
  );
}
