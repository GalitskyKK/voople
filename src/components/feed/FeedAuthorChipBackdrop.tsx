import type { ProfileCustomizationView } from "@/types/domain";

type FeedAuthorChipBackdropProps = {
  customization: ProfileCustomizationView;
};

/**
 * Фон полоски автора в ленте — только feed-card ассет + нейтральный scrim.
 * Цвета темы карточки профиля (Voople+) сюда не попадают.
 */
export function FeedAuthorChipBackdrop({ customization }: FeedAuthorChipBackdropProps) {
  const bgUrl = customization.assets.feedCardBackgroundUrl;

  return (
    <>
      <div
        className="absolute inset-0 bg-[var(--app-surface-soft)] bg-cover bg-right"
        style={{
          backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[color-mix(in_srgb,var(--app-surface)_96%,transparent)] via-[color-mix(in_srgb,var(--app-surface)_88%,transparent)] to-transparent" />
    </>
  );
}
