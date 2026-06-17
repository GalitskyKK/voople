"use client";

type PostComposerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
};

export function PostComposer({
  value,
  onChange,
  disabled = false,
  maxLength = 280,
}: PostComposerProps) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={maxLength}
        placeholder="Что нового?"
        rows={4}
        className="w-full resize-none rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-black/30 px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[color-mix(in_srgb,var(--foreground)_40%,transparent)] disabled:opacity-50"
      />
      <p className="mt-1 text-right text-xs text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">
        {value.length}/{maxLength}
      </p>
    </div>
  );
}
