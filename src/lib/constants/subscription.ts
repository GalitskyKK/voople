export type VooplePlusPlanId = "monthly" | "annual";

export type VooplePlusPlan = {
  id: VooplePlusPlanId;
  label: string;
  priceRub: number;
  periodDays: number;
  note: string;
};

export const VOOPLUS_PLANS: readonly VooplePlusPlan[] = [
  {
    id: "monthly",
    label: "Месяц",
    priceRub: 199,
    periodDays: 30,
    note: "Гибкий вариант",
  },
  {
    id: "annual",
    label: "Год",
    priceRub: 1_990,
    periodDays: 365,
    note: "2 месяца в подарок",
  },
] as const;

export const DEFAULT_VOOPLUS_PLAN_ID: VooplePlusPlanId = "monthly";

export function getVooplePlusPlan(id: VooplePlusPlanId): VooplePlusPlan {
  return VOOPLUS_PLANS.find((plan) => plan.id === id) ?? VOOPLUS_PLANS[0]!;
}

/** Обратная совместимость для месячного тарифа и пробных периодов. */
export const VOOPLUS_PRICE_RUB = getVooplePlusPlan("monthly").priceRub;
export const VOOPLUS_PERIOD_DAYS = getVooplePlusPlan("monthly").periodDays;

/** Подписка не продлевается автоматически — только повторная оплата вручную. */
export const VOOPLUS_IS_RECURRING = false;

export const VOOPLUS_TIER = "plus" as const;

export const VOOPLUS_BENEFITS = [
  "Свои баннеры и расширенные фоны карточки",
  "Премиум-рамки, темы приложения и точные цвета",
  "Шрифты и эффекты имени с примеркой до оплаты",
  "Пин Voople+ и расширенные возможности общения",
] as const;
