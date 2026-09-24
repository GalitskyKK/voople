import { Skeleton } from "@/components/ui/Skeleton";

export function ProfileLoadingView() {
  return (
    <section
      className="voople-profile-page flex w-full flex-col gap-4 py-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-6 lg:py-6"
      role="status"
      aria-label="Загружаем профиль"
      aria-busy="true"
    >
      <div className="voople-profile-page__card w-full shrink-0 overflow-hidden rounded-[var(--material-radius)] bg-[var(--material-panel-fill)] lg:w-[320px]">
        <Skeleton shape="room" className="h-36 w-full !rounded-none" />
        <div className="space-y-4 px-5 pb-6">
          <Skeleton shape="avatar" className="-mt-9 h-[72px] w-[72px] border-4 border-[var(--material-panel-fill)]" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </div>
      <div className="voople-profile-page__context min-w-0 flex-1 space-y-4" aria-hidden="true">
        <Skeleton className="h-5 w-36" />
        {[0, 1].map((item) => (
          <div key={item} className="voople-material-row flex min-h-16 items-center gap-3 px-4">
            <Skeleton shape="avatar" className="h-10 w-10" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-32 max-w-full" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
