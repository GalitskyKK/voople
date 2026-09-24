const skeleton = "rounded-[var(--app-radius-sm)] bg-[var(--app-surface-soft)]";

export function ProfileLoadingView() {
  return (
    <section
      className="voople-profile-page flex w-full flex-col gap-4 py-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-6 lg:py-6"
      role="status"
      aria-label="Загружаем профиль"
      aria-busy="true"
    >
      <div className="voople-profile-page__card w-full shrink-0 overflow-hidden rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-surface)] lg:w-[320px]">
        <div className="h-36 bg-[var(--app-surface-soft)]" />
        <div className="space-y-4 px-5 pb-6">
          <div className="-mt-9 h-[72px] w-[72px] rounded-[var(--app-radius-lg)] border-4 border-[var(--app-surface)] bg-[var(--app-border-strong)]" />
          <div className="space-y-2" aria-hidden="true">
            <div className={`${skeleton} h-5 w-2/3`} />
            <div className={`${skeleton} h-3 w-2/5`} />
          </div>
          <div className="grid grid-cols-3 gap-3 border-y border-[var(--app-border)] py-4" aria-hidden="true">
            {[0, 1, 2].map((item) => <div key={item} className={`${skeleton} h-8`} />)}
          </div>
          <div className={`${skeleton} h-4 w-4/5`} aria-hidden="true" />
          <div className={`${skeleton} h-4 w-3/5`} aria-hidden="true" />
        </div>
      </div>
      <div className="voople-profile-page__posts min-w-0 flex-1 space-y-4" aria-hidden="true">
        <div className="border-b border-[var(--app-border)] pb-3"><div className={`${skeleton} h-5 w-24`} /></div>
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
          <div className={`${skeleton} h-4 w-2/5`} />
          <div className={`${skeleton} mt-5 h-4 w-full`} />
          <div className={`${skeleton} mt-2 h-4 w-4/5`} />
        </div>
      </div>
    </section>
  );
}
