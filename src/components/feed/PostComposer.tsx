"use client";

type PostComposerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
  compact?: boolean;
  autoFocus?: boolean;
};

export function PostComposer({
  value,
  onChange,
  disabled = false,
  maxLength = 280,
  placeholder = "Что нового?",
  compact = false,
  autoFocus = false,
}: PostComposerProps) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={compact ? 2 : 4}
        autoFocus={autoFocus}
        className="w-full resize-none rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-black/20 px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[color-mix(in_srgb,var(--foreground)_40%,transparent)] focus:border-[color-mix(in_srgb,var(--theme-accent)_55%,transparent)] disabled:opacity-50"
      />
      {compact && value.length === 0 ? null : (
        <p className="mt-1 text-right text-xs text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">{value.length}/{maxLength}</p>
      )}
    </div>
  );
}
