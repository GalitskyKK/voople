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

export const VOOPLUS_AVATAR_HISTORY_LIMIT = 12;
export const FREE_AVATAR_HISTORY_LIMIT = 3;

export const VOOPLUS_FEATURE_GROUPS = [
  {
    id: "identity",
    title: "Образ, который узнают",
    description: "Соберите цельный стиль и перенесите его из профиля в ленту и сообщения.",
    features: [
      "Свой баннер, фоны и расширенные рамки карточки",
      "Точные цвета, шрифты и эффекты имени",
      "Пин Вупл+ рядом с именем в профиле, ленте и сообщениях",
    ],
  },
  {
    id: "comfort",
    title: "Приложение под вас",
    description: "Оформление синхронизируется между web и desktop и остаётся знакомым на каждом устройстве.",
    features: [
      "Четыре дополнительные цветовые темы интерфейса",
      "Фоны диалогов с полноценным предпросмотром",
      `История из ${VOOPLUS_AVATAR_HISTORY_LIMIT} недавних аватаров с быстрым возвратом`,
    ],
  },
  {
    id: "groups",
    title: "Буст своей группы",
    description: "Выберите главное пространство и сделайте его визуально своим.",
    features: [
      "Три распределяемых буста групп",
      "Уровни 1 / 3 / 6 / 12 / 24 с эмодзи, звуками, баннерами и тегом",
      "72 часа сохранения perks и безопасный перенос слота раз в 7 дней",
    ],
  },
  {
    id: "media",
    title: "Больше места для моментов",
    description: "Тяжёлые галереи и качественные личные демонстрации без урезания базовых функций.",
    features: [
      "До 100 МБ на файл и 500 МБ на публикацию",
      "Личные демонстрации экрана в 1080p / 60 FPS",
      "Облачные черновики между браузером и приложением",
    ],
  },
  {
    id: "emoji",
    title: "Эмодзи ваших пространств",
    description: "Характер группы остаётся с вами и в других разговорах.",
    features: [
      "Групповые PNG, WebP и GIF-эмодзи",
      "Использование доступных групповых эмодзи в других чатах",
      "Текстовый fallback: сообщения читаются на любом клиенте",
    ],
  },
] as const;

export const VOOPLUS_BENEFITS = VOOPLUS_FEATURE_GROUPS.flatMap((group) => group.features);
