import { VoopleMark } from "./VoopleMark";

export function BrandedLoadingView({
  label = "Открываем Voople",
  fullscreen = false,
  compact = false,
}: {
  label?: string;
  fullscreen?: boolean;
  compact?: boolean;
}) {
  return (
    <section
      className={`voople-branded-loading ${fullscreen ? "voople-branded-loading--fullscreen" : ""} ${compact ? "voople-branded-loading--compact" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="voople-branded-loading__mark" aria-hidden="true">
        <VoopleMark className="h-full w-full" />
      </span>
      <span className="voople-branded-loading__label">{label}</span>
      <span className="voople-branded-loading__dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </section>
  );
}
