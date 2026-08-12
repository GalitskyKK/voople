export const MERCHANT = {
  fullName: "Галицких Никита Андреевич",
  inn: "662510924150",
  email: "ngalitskikh@gmail.com",
  status: "Плательщик налога на профессиональный доход (самозанятый)",
  serviceName: "Voople",
  siteUrl: "https://voople.ru",
} as const;

export const LEGAL_PAGES = [
  { href: "/legal/privacy", label: "Политика конфиденциальности" },
  { href: "/legal/services", label: "Услуги и цены" },
  { href: "/legal/delivery", label: "Получение заказа" },
  { href: "/legal/offer", label: "Публичная оферта" },
  { href: "/legal/terms", label: "Условия использования" },
  { href: "/legal/contacts", label: "Контакты и реквизиты" },
] as const;

export const LEGAL_COMPACT_LINKS = [
  { href: "/legal/privacy", label: "Конфиденциальность" },
  { href: "/legal/terms", label: "Условия" },
  { href: "/legal/offer", label: "Оферта" },
  { href: "/legal/contacts", label: "Контакты" },
] as const;

export const LEGAL_UPDATED = "11 августа 2026 г.";

/** Версии сохраняются в auth metadata в момент явного согласия пользователя. */
export const PRIVACY_VERSION = "2026-08-11";
export const TERMS_VERSION = "2026-08-11";
