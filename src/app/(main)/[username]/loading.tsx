export default function ProfileLoading() {
  return (
    <div className="animate-pulse p-6 lg:flex lg:gap-6">
      <div className="h-[480px] w-full rounded-2xl bg-white/10 lg:w-[320px]" />
      <div className="mt-4 flex-1 space-y-4 lg:mt-0">
        <div className="h-28 rounded-2xl bg-white/10" />
        <div className="h-28 rounded-2xl bg-white/10" />
      </div>
    </div>
  );
}
