/** Тариф Voople+ (месяц). Цена в рублях, целое число. */
export const VOOPLUS_PRICE_RUB = 199;

/** Срок подписки после успешной оплаты (разовая оплата, без автопродления). */
export const VOOPLUS_PERIOD_DAYS = 30;

/** Подписка не продлевается автоматически — только повторная оплата вручную. */
export const VOOPLUS_IS_RECURRING = false;

export const VOOPLUS_TIER = "plus" as const;

export const VOOPLUS_BENEFITS = [
  "Свой баннер: фото, GIF или рисование на холсте",
  "Бейдж Voople+ в профиле",
  "Поддержка развития сервиса",
] as const;
