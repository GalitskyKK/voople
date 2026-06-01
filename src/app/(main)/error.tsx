"use client";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <p className="text-white/70">Что-то пошло не так</p>
      <p className="text-sm text-white/40">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-[#7B3AED] px-4 py-2 text-sm text-white"
      >
        Повторить
      </button>
    </div>
  );
}
