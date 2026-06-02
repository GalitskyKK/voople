import { LegalLinks } from "./LegalLinks";

export function LegalMobileStrip() {
  return (
    <div className="pointer-events-none fixed inset-x-0 z-20 flex justify-center px-4 pb-[max(5.25rem,calc(4.25rem+env(safe-area-inset-bottom)))] lg:hidden">
      <div className="pointer-events-auto max-w-md rounded-full border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-surface)_88%,transparent)] px-3 py-1.5 shadow-[var(--app-shadow-sm)] backdrop-blur-md">
        <LegalLinks variant="compact" />
      </div>
    </div>
  );
}
