"use client";

export default function ProfileError({ reset }: { reset: () => void }) {
  return (
    <div className="p-8 text-center">
      <p className="text-white/70">Не удалось загрузить профиль</p>
      <button type="button" onClick={reset} className="mt-4 text-[#7B3AED]">
        Повторить
      </button>
    </div>
  );
}
