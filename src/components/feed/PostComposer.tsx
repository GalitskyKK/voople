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
        className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40 disabled:opacity-50"
      />
      <p className="mt-1 text-right text-xs text-white/40">
        {value.length}/{maxLength}
      </p>
    </div>
  );
}
