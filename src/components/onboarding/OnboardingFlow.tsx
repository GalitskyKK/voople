"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Compass, MessageCircle, Sparkles, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { MediaUploadControl } from "@/components/media/MediaUploadControl";
import { Button } from "@/components/ui/Button";
import { getMoodEmoji, getMoodLabel } from "@/lib/constants/mood";
import { trpc } from "@/lib/trpc/client";

export function OnboardingFlow({
  username,
  redirectAfter,
}: {
  username: string;
  redirectAfter?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(username);
  const [bio, setBio] = useState("");
  const [moodValue, setMoodValue] = useState(7);
  const [thought, setThought] = useState("");
  const [nextDestination, setNextDestination] = useState<"profile" | "people" | "messages">("profile");
  const [error, setError] = useState<string | null>(null);
  const updateProfile = trpc.profile.update.useMutation();
  const saveStatus = trpc.status.save.useMutation();
  const setAvatar = trpc.customization.setAvatarPhoto.useMutation();
  const busy = updateProfile.isPending || saveStatus.isPending || setAvatar.isPending;

  const finish = async () => {
    setError(null);
    try {
      await Promise.all([
        updateProfile.mutateAsync({ displayName: displayName.trim() || username, bio: bio.trim() || null }),
        saveStatus.mutateAsync({ moodValue, thought: thought.trim() || null }),
      ]);
      const destination = nextDestination === "people"
        ? "/explore"
        : nextDestination === "messages"
          ? "/messages"
          : `/${username}`;
      router.replace(redirectAfter ?? destination);
      router.refresh();
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : "Не удалось сохранить профиль");
    }
  };

  return (
    <main id="main-content" className="grid min-h-dvh place-items-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div><p className="text-xl font-bold tracking-[-.04em]">Voople</p><p className="mt-1 text-sm text-[var(--app-muted)]">Соберём первый живой профиль</p></div>
          <span className="text-sm tabular-nums text-[var(--app-muted)]">{step + 1} / 3</span>
        </div>
        <div className="mb-6 grid grid-cols-3 gap-2" aria-hidden>{[0, 1, 2].map((item) => <span key={item} className={`h-1.5 rounded-full ${item <= step ? "bg-[var(--theme-accent)]" : "bg-[var(--app-surface-soft)]"}`} />)}</div>

        <section className="voople-panel min-h-[430px] p-5 sm:p-8">
          {step === 0 ? (
            <div className="mx-auto max-w-md">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--theme-accent)_15%,transparent)] text-[var(--theme-accent)]"><Sparkles className="h-5 w-5" /></span>
              <h1 className="mt-5 text-3xl font-bold tracking-[-.04em]">Как вас будут видеть?</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">Имя и описание всегда можно изменить позже.</p>
              <div className="mt-7 flex items-start gap-4">
                <MediaUploadControl purpose="avatar" onChange={(media) => { if (media) setAvatar.mutate({ mediaKey: media.mediaKey }); }} buttonClassName="border border-[var(--app-border)]" />
              </div>
              <label className="voople-label mt-5 block">Отображаемое имя<input className="voople-input mt-1.5" maxLength={50} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
              <label className="voople-label mt-4 block">Пара слов о себе<textarea className="voople-input mt-1.5 min-h-24 resize-none" maxLength={100} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Чем вы увлекаетесь?" /></label>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="mx-auto max-w-md">
              <h1 className="text-3xl font-bold tracking-[-.04em]">Какой сегодня муд?</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">Он появится в карточке профиля, но пока не будет опубликован в ленте.</p>
              <div className="mt-10 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-6 text-center">
                <div className="text-5xl">{getMoodEmoji(moodValue)}</div>
                <p className="mt-3 text-xl font-semibold">{getMoodLabel(moodValue)}</p>
                <input className="mt-7 w-full accent-[var(--theme-accent)]" type="range" min={1} max={10} value={moodValue} onChange={(event) => setMoodValue(Number(event.target.value))} aria-label="Настроение" />
              </div>
              <label className="voople-label mt-5 block">Что происходит?<input className="voople-input mt-1.5" maxLength={80} value={thought} onChange={(event) => setThought(event.target.value)} placeholder="Одной фразой — или оставьте пустым" /></label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mx-auto flex max-w-md flex-col items-center py-12 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15 text-emerald-400"><Check className="h-8 w-8" /></span>
              <h1 className="mt-6 text-3xl font-bold tracking-[-.04em]">Профиль готов</h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--app-muted)]">Дальше можно записать первый кружок, выбрать оформление и найти друзей.</p>
              {!redirectAfter ? <div className="mt-6 grid w-full grid-cols-3 gap-2" role="radiogroup" aria-label="Куда перейти после настройки">
                {([
                  ["profile", "Профиль", UserRound],
                  ["people", "Найти людей", Compass],
                  ["messages", "Открыть чаты", MessageCircle],
                ] as const).map(([id, label, Icon]) => <button key={id} type="button" role="radio" aria-checked={nextDestination === id} onClick={() => setNextDestination(id)} className={`rounded-2xl border p-3 text-xs font-medium transition ${nextDestination === id ? "border-(--theme-accent) bg-[var(--app-accent-soft)] text-[var(--foreground)]" : "border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--foreground)]"}`}><Icon className="mx-auto mb-2 h-5 w-5" />{label}</button>)}
              </div> : null}
              <div className="mt-7 w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4 text-left"><p className="font-semibold">{displayName || username}</p><p className="text-sm text-[var(--app-muted)]">@{username}</p><p className="mt-3 text-sm">{getMoodEmoji(moodValue)} {thought || getMoodLabel(moodValue)}</p></div>
            </div>
          ) : null}

          {error ? <p className="mx-auto mt-5 max-w-md text-sm text-red-400">{error}</p> : null}
          <div className="mx-auto mt-8 flex max-w-md items-center justify-between gap-3">
            <Button type="button" variant="ghost" disabled={step === 0 || busy} onClick={() => setStep((value) => value - 1)}><ArrowLeft className="h-4 w-4" />Назад</Button>
            {step < 2 ? <Button type="button" disabled={busy || (step === 0 && !displayName.trim())} onClick={() => setStep((value) => value + 1)}>Дальше<ArrowRight className="h-4 w-4" /></Button> : <Button type="button" disabled={busy} onClick={() => void finish()}>{busy ? "Сохраняем…" : redirectAfter ? "Продолжить" : nextDestination === "people" ? "Найти людей" : nextDestination === "messages" ? "Открыть чаты" : "Открыть профиль"}<ArrowRight className="h-4 w-4" /></Button>}
          </div>
        </section>
      </div>
    </main>
  );
}
