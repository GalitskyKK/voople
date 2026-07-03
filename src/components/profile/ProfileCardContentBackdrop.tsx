/**
 * Стеклянная подложка под контентом карточки при video background.
 * Видео остаётся видимым по краям и в верхней зоне; текст читается за счёт blur + tint.
 */
export function ProfileCardContentBackdrop() {
  return (
    <div
      className="profile-card-content-backdrop pointer-events-none absolute inset-0 rounded-[var(--profile-section-radius)]"
      aria-hidden
    />
  );
}
