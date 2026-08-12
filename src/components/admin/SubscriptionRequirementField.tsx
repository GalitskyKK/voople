export function SubscriptionRequirementField({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3 text-sm">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-0.5" />
      <span>
        <span className="block font-medium">Требует Voople+</span>
        <span className="mt-0.5 block text-xs text-[var(--app-muted)]">
          Предмет будет выделен как часть подписки и не применится без активного Voople+.
        </span>
      </span>
    </label>
  );
}
