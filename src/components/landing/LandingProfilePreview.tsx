import { Eye, FileText, Flame, Music2, Sparkles, UserPlus, Users } from "lucide-react";

export function LandingProfilePreview() {
  return (
    <div className="landing-profile-preview">
      <div className="landing-profile-preview__halo" aria-hidden="true" />
      <div className="landing-profile-preview__shell">
        <article
          className="profile-card profile-card--split relative text-[#f4f4f7]"
          style={{
            "--profile-banner-height": "8.25rem",
            "--profile-section-gap": "2.35rem",
          } as React.CSSProperties}
          aria-label="Пример актуальной карточки профиля Voople"
        >
          <div className="flex flex-col gap-[var(--profile-section-gap)]">
            <div className="profile-card__banner bg-[radial-gradient(circle_at_78%_18%,#c084fc_0,transparent_30%),linear-gradient(120deg,#312e81,#111827_72%)]">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            <div className="profile-card__body bg-[#17171d] px-4 pb-4 shadow-[0_22px_60px_rgba(0,0,0,.3)]">
              <div className="relative z-10 -mt-9 flex items-end justify-between">
                <div className="relative grid h-[72px] w-[72px] place-items-center rounded-full border-[5px] border-[#17171d] bg-[linear-gradient(135deg,#8b5cf6,#ec4899)] text-2xl font-bold text-white shadow-lg">
                  V
                  <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] border-[#17171d] bg-emerald-400" />
                </div>
                <span className="mb-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300">в сети</span>
              </div>

              <div className="mt-3 flex min-w-0 items-center gap-2">
                <h2 className="truncate text-xl font-bold">Сегодня всё получится ✦</h2>
                <span className="shrink-0 text-sm" title="Пин команды Orbit">🔮</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-white/50">
                <span>@yourname</span>
                <span className="text-cyan-300">✦</span>
                <span className="text-violet-300">◉</span>
              </div>

              <p className="mt-3 text-sm text-white/68">ловлю хорошие моменты и собираю музыку для ночных прогулок</p>
              <p className="mt-2 whitespace-nowrap text-[10px] text-white/38">На Voople 25.05.2026 · Voople+ 21.07.2026</p>

              <div className="voople-mood-card relative mt-3 overflow-hidden" style={{ "--mood-color": "#f97316" } as React.CSSProperties}>
                <div className="relative z-[1]">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span className="text-sm font-semibold">Горю</span>
                    <Sparkles className="ml-auto h-3.5 w-3.5 text-white/35" />
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full w-[82%] rounded-full bg-orange-400" /></div>
                  <p className="mt-2 text-sm text-white/76">словил летний вайб, кто гулять?</p>
                  <div className="mt-2 flex items-center gap-2 border-t border-white/8 pt-2 text-xs text-white/55"><Music2 className="h-3.5 w-3.5 text-violet-300" /><span className="truncate">Tame Impala — The Less I Know The Better</span></div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-white/50">
                <span>Реакции</span>
                <div className="flex gap-1"><span className="rounded-full bg-white/5 px-2 py-1">💜 18</span><span className="rounded-full bg-white/5 px-2 py-1">🔥 7</span><span className="rounded-full bg-white/5 px-2 py-1">✨ 4</span></div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-2 text-xs text-white/62" aria-label="Статистика профиля">
                <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-white/38" />29</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-white/38" />128</span>
                <span className="flex items-center gap-1"><UserPlus className="h-3.5 w-3.5 text-white/38" />42</span>
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-white/38" />1.4K</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
