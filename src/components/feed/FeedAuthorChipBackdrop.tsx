type FeedAuthorChipBackdropProps = {
  backgroundUrl?: string | null;
};

/**
 * Фон полоски автора в ленте — только feed-card ассет + нейтральный scrim.
 * Цвета темы карточки профиля (Voople+) сюда не попадают.
 */
export function FeedAuthorChipBackdrop({ backgroundUrl }: FeedAuthorChipBackdropProps) {
  return (
    <>
      <div className="absolute inset-0 bg-[#17171d]" />
      <div
        className="absolute inset-0 border-solid"
        style={{
          borderImageSource: backgroundUrl ? `url(${backgroundUrl})` : undefined,
          borderImageSlice: "0 450 0 320 fill",
          borderImageWidth: "0 105px 0 75px",
          borderImageRepeat: "stretch",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[rgb(18_18_24/0.96)] via-[rgb(18_18_24/0.72)] to-[rgb(18_18_24/0.08)]" />
    </>
  );
}
