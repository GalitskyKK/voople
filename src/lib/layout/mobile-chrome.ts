/** Высота pill bottom nav (см. BottomNav h-[3.625rem]). */
export const MOBILE_BOTTOM_NAV_HEIGHT = "3.625rem";

/** Отступ плеера над навбаром + safe-area. */
export const MOBILE_PLAYER_BOTTOM =
  `calc(${MOBILE_BOTTOM_NAV_HEIGHT} + max(1rem, env(safe-area-inset-bottom)) + 0.5rem)`;

/** Высота развёрнутой карточки плеера. */
export const MOBILE_PLAYER_HEIGHT_EXPANDED = "5.75rem";

/** Высота свёрнутой карточки плеера. */
export const MOBILE_PLAYER_HEIGHT_COLLAPSED = "3.25rem";

export function mobileFabBottomWithPlayer(mobilePlayerExpanded: boolean) {
  const playerHeight = mobilePlayerExpanded
    ? MOBILE_PLAYER_HEIGHT_EXPANDED
    : MOBILE_PLAYER_HEIGHT_COLLAPSED;
  return `calc(${MOBILE_PLAYER_BOTTOM} + ${playerHeight} + 0.75rem)`;
}

/** FAB по умолчанию (над навбаром). */
export const MOBILE_FAB_BOTTOM_DEFAULT = "5.5rem";
