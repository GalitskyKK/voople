export default function MainLoading() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-48 rounded-lg bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]" />
      <div className="h-32 rounded-2xl bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]" />
    </div>
  );
}
