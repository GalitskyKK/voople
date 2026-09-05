"use client";

import { Headphones, LoaderCircle, LogOut, Mic, MicOff, MonitorPlay, UsersRound } from "lucide-react";
import { useRef, useState } from "react";

import { VoopleMark } from "@/components/brand/VoopleMark";
import { Button } from "@/components/ui/Button";
import { useRoomGuestSession } from "@/hooks/useRoomGuestSession";

const UNAVAILABLE_COPY = {
  missing: "Ссылка не найдена или записана не полностью.",
  expired: "Срок действия ссылки истёк. Попросите участника комнаты создать новую.",
  revoked: "Ссылку отозвали. Попросите участника комнаты создать новую.",
  ended: "Разговор уже завершился.",
  full: "Все гостевые места заняты.",
} as const;

export function RoomGuestPage({ token }: { token: string }) {
  const audioRootRef = useRef<HTMLDivElement | null>(null);
  const screenRootRef = useRef<HTMLDivElement | null>(null);
  const guest = useRoomGuestSession(token, { audioRootRef, screenRootRef });
  const [displayName, setDisplayName] = useState("");
  const [joinPending, setJoinPending] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const join = async () => {
    if (joinPending) return;
    setJoinPending(true);
    setJoinError(null);
    try {
      await guest.join(displayName);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Не удалось войти в комнату");
    } finally {
      setJoinPending(false);
    }
  };

  return (
    <main id="main-content" className="min-h-dvh bg-[var(--background)] px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-5xl flex-col sm:min-h-[calc(100dvh-4rem)]">
        <header className="flex h-11 items-center gap-2 text-sm font-semibold">
          <VoopleMark className="h-7 w-7" />
          Voople
          <span className="font-normal text-[var(--app-muted)]">· гостевой вход</span>
        </header>

        <section className="my-auto overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-md)]">
          {guest.previewLoading ? (
            <div className="grid min-h-[30rem] gap-8 p-6 md:grid-cols-[minmax(0,1fr)_21rem] md:p-10" aria-label="Проверяем приглашение">
              <div className="space-y-4">
                <div className="h-5 w-32 animate-pulse rounded bg-[var(--app-surface-soft)] motion-reduce:animate-none" />
                <div className="h-10 w-3/4 animate-pulse rounded-lg bg-[var(--app-surface-soft)] motion-reduce:animate-none" />
                <div className="h-5 w-1/2 animate-pulse rounded bg-[var(--app-surface-soft)] motion-reduce:animate-none" />
              </div>
              <div className="h-64 animate-pulse rounded-[var(--app-radius-lg)] bg-[var(--app-surface-soft)] motion-reduce:animate-none" />
            </div>
          ) : guest.previewError ? (
            <div className="grid min-h-[26rem] place-content-center px-6 py-12 text-center">
              <h1 className="text-2xl font-semibold">Не удалось проверить приглашение</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--app-muted)]">{guest.previewError}</p>
              <Button className="mx-auto mt-6" variant="secondary" onClick={() => void guest.loadPreview()}>
                Повторить
              </Button>
            </div>
          ) : !guest.preview?.available && !guest.joined ? (
            <div className="grid min-h-[26rem] place-content-center px-6 py-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-[var(--app-radius-md)] bg-[var(--app-surface-soft)] text-[var(--app-muted)]">
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold">В комнату уже не войти</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--app-muted)]">
                {guest.preview ? UNAVAILABLE_COPY[guest.preview.reason as keyof typeof UNAVAILABLE_COPY] : "Приглашение недоступно."}
              </p>
            </div>
          ) : guest.joined ? (
            <div className="flex min-h-[34rem] flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] px-5 py-4 sm:px-7">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{guest.preview?.roomName ?? "Комната"}</p>
                  <p className="mt-0.5 text-sm text-[var(--app-muted)]">
                    {guest.preview?.groupName} · {guest.participantCount} в разговоре
                  </p>
                </div>
                <p className="flex items-center gap-2 text-sm text-[var(--app-muted)]" role="status">
                  <span className={`h-2 w-2 rounded-full ${guest.mediaStatus === "connected" ? "bg-emerald-400" : "bg-amber-400"}`} />
                  {guest.mediaStatus === "connected" ? "Голос подключён"
                    : guest.mediaStatus === "reconnecting" ? "Восстанавливаем связь"
                      : guest.mediaStatus === "connecting" ? "Подключаем голос" : "Голос не подключён"}
                </p>
              </div>

              <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[color-mix(in_srgb,var(--background)_72%,var(--app-surface))] p-4 sm:p-7">
                <div ref={screenRootRef} className={`absolute inset-4 overflow-hidden rounded-[var(--app-radius-lg)] bg-black sm:inset-7 ${guest.screenVisible ? "block" : "hidden"}`} />
                {!guest.screenVisible ? (
                  <div className="max-w-md text-center">
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--app-accent-soft)] text-[var(--theme-accent)]">
                      <Headphones className="h-7 w-7" aria-hidden="true" />
                    </span>
                    <h1 className="mt-5 text-2xl font-semibold">Вы в комнате как {guest.joined.displayName}</h1>
                    <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                      Вы услышите разговор и увидите демонстрацию экрана, когда участник её включит.
                    </p>
                  </div>
                ) : (
                  <span className="absolute left-7 top-7 z-10 flex items-center gap-2 rounded-lg bg-black/75 px-3 py-2 text-xs text-white sm:left-10 sm:top-10">
                    <MonitorPlay className="h-4 w-4" aria-hidden="true" /> Демонстрация
                  </span>
                )}
                <div ref={audioRootRef} className="hidden" aria-hidden="true" />
              </div>

              {guest.mediaError ? (
                <div className="border-t border-red-400/20 bg-red-400/10 px-5 py-3 text-sm text-red-300" role="alert">
                  {guest.mediaError}
                  <Button size="sm" variant="ghost" className="ml-2" onClick={() => void guest.connect()}>
                    Подключить снова
                  </Button>
                </div>
              ) : null}
              <footer className="flex items-center justify-center gap-3 border-t border-[var(--app-border)] px-5 py-4">
                <Button
                  variant={guest.micMuted ? "secondary" : "primary"}
                  aria-pressed={!guest.micMuted}
                  disabled={guest.mediaStatus !== "connected"}
                  onClick={() => void guest.toggleMicrophone()}
                >
                  {guest.micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {guest.micMuted ? "Включить микрофон" : "Выключить микрофон"}
                </Button>
                <Button variant="secondary" onClick={() => void guest.leave()}>
                  <LogOut className="h-4 w-4" /> Выйти
                </Button>
              </footer>
            </div>
          ) : (
            <div className="grid min-h-[32rem] md:grid-cols-[minmax(0,1fr)_23rem]">
              <div className="flex flex-col justify-between border-b border-[var(--app-border)] p-6 md:border-b-0 md:border-r md:p-10">
                <div>
                  <p className="text-sm font-medium text-[var(--theme-accent)]">{guest.preview?.groupName}</p>
                  <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
                    Войти в комнату «{guest.preview?.roomName}»
                  </h1>
                  <p className="mt-4 max-w-xl text-base leading-7 text-[var(--app-muted)]">
                    Ссылка ведёт только в этот живой разговор. Остальные разделы группы и история сообщений гостю не откроются.
                  </p>
                </div>
                <div className="mt-10">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <UsersRound className="h-4 w-4 text-[var(--theme-accent)]" aria-hidden="true" />
                    {guest.preview?.participantCount || "Пока никто не"} в разговоре
                  </p>
                  {guest.preview?.participants.length ? (
                    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Участники комнаты">
                      {guest.preview.participants.slice(0, 8).map((participant) => (
                        <li key={participant.id} className="flex items-center gap-2 rounded-full bg-[var(--app-surface-soft)] py-1.5 pl-1.5 pr-3 text-sm">
                          <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-[var(--app-accent-soft)] text-xs font-semibold text-[var(--theme-accent)]">
                            {participant.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={participant.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : participant.displayName.slice(0, 1).toLocaleUpperCase("ru-RU")}
                          </span>
                          <span>{participant.displayName}</span>
                          {participant.guest ? <span className="text-xs text-[var(--app-muted)]">гость</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>

              <form className="flex flex-col justify-center p-6 md:p-8" onSubmit={(event) => { event.preventDefault(); void join(); }}>
                <h2 className="text-xl font-semibold">Как вас представить?</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
                  Имя увидят участники этой комнаты. Аккаунт создавать не обязательно.
                </p>
                <label className="mt-6 text-sm font-medium" htmlFor="guest-display-name">Ваше имя</label>
                <input
                  id="guest-display-name"
                  value={displayName}
                  maxLength={40}
                  autoComplete="name"
                  required
                  autoFocus
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="mt-2 h-11 rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--background)] px-3 outline-none transition-colors placeholder:text-[var(--app-muted)] hover:border-[var(--app-border-strong)] focus:border-[var(--theme-accent)]"
                  placeholder="Например, Никита"
                />
                {joinError ? <p className="mt-3 text-sm text-red-400" role="alert">{joinError}</p> : null}
                <Button type="submit" size="lg" className="mt-5 w-full" disabled={joinPending || !displayName.trim()}>
                  {joinPending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Headphones className="h-4 w-4" />}
                  {joinPending ? "Подключаем" : "Зайти гостем"}
                </Button>
                <p className="mt-4 text-xs leading-5 text-[var(--app-muted)]">
                  Микрофон при входе выключен. Вы сможете включить его сами.
                </p>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
