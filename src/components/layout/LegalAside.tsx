import { LegalLinks } from "./LegalLinks";

export function LegalAside() {
  return (
    <aside
      className="voople-legal-aside hidden w-[260px] shrink-0 lg:block xl:w-[280px]"
      aria-label="Правовая информация"
    >
      <div className="sticky top-20 flex min-h-[calc(100dvh-5rem)] flex-col justify-end pb-8 pl-2">
        <LegalLinks variant="aside" />
      </div>
    </aside>
  );
}
