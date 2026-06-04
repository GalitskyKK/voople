type ChatDateDividerProps = {
  label: string;
};

export function ChatDateDivider({ label }: ChatDateDividerProps) {
  return (
    <div className="voople-chat-date flex justify-center py-2">
      <span className="rounded-full bg-[color-mix(in_srgb,var(--app-surface)_88%,transparent)] px-3 py-1 text-xs font-medium text-[var(--app-muted)] shadow-[var(--app-shadow-sm)]">
        {label}
      </span>
    </div>
  );
}
