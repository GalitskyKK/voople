"use client";

import Link from "next/link";

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
      <Link href={SHOP_HREF} className="profile-editor-shop-link">
        Открыть магазин
      </Link>
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
