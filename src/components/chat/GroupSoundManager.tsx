"use client";

import { LoaderCircle, Play, Plus, Trash2, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { GroupSoundView } from "@/types/chat";

type SoundList = { items: GroupSoundView[]; limit: number };

export function GroupSoundManager({ canManage, load, create, remove, upload }: {
  canManage: boolean;
  load: () => Promise<SoundList>;
  create: (input: { name: string; uploadKey: string; rightsConfirmed: true }) => Promise<GroupSoundView>;
  remove: (soundId: string) => Promise<unknown>;
  upload?: (file: File) => Promise<{ mediaKey: string }>;
}) {
  const [data, setData] = useState<SoundList | null>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    void load().then((value) => { if (active) setData(value); }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Не удалось загрузить звуки");
    });
    return () => { active = false; previewRef.current?.pause(); };
  }, [load]);

  const preview = (sound: GroupSoundView) => {
    previewRef.current?.pause();
    const audio = new Audio(sound.url);
    previewRef.current = audio;
    void audio.play().catch(() => setError("Браузер заблокировал воспроизведение звука"));
  };

  const submit = async () => {
    if (!file || !upload || pending || !rightsConfirmed) return;
    setPending("create"); setError(null);
    try {
      const uploaded = await upload(file);
      const sound = await create({ name, uploadKey: uploaded.mediaKey, rightsConfirmed: true });
      setData((current) => current ? { ...current, items: [...current.items, sound] } : current);
      setFile(null); setName(""); setRightsConfirmed(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось добавить звук");
    } finally { setPending(null); }
  };

  if (!data && !error) return <div className="mt-3 h-24 animate-pulse rounded-xl bg-[var(--app-surface-soft)]" />;
  return (
    <section className="mt-3 rounded-2xl border border-[var(--app-border)] p-3" aria-labelledby="group-sounds-title">
      <h3 id="group-sounds-title" className="flex items-center gap-2 text-sm font-medium"><Volume2 className="h-4 w-4" />Звуки группы</h3>
      <p className="mt-0.5 text-xs text-[var(--app-muted)]">{data?.items.length ?? 0} из {data?.limit ?? 0} · до 10 секунд</p>
      {data?.items.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{data.items.map((sound) => (
        <div key={sound.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-[var(--app-surface-soft)] p-2">
          <button type="button" onClick={() => preview(sound)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--app-accent-soft)] text-[var(--theme-accent)]" aria-label={`Прослушать ${sound.name}`}><Play className="h-3.5 w-3.5 fill-current" /></button>
          <span className="min-w-0 flex-1 truncate text-xs font-medium">{sound.name}</span>
          <span className="shrink-0 text-[10px] tabular-nums text-[var(--app-muted)]">{(sound.durationMs / 1000).toFixed(1)} c</span>
          {canManage ? <button type="button" disabled={Boolean(pending)} onClick={async () => {
            setPending(sound.id); setError(null);
            try { await remove(sound.id); setData((current) => current ? { ...current, items: current.items.filter((item) => item.id !== sound.id) } : current); }
            catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось удалить звук"); }
            finally { setPending(null); }
          }} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-400" aria-label={`Удалить ${sound.name}`}><Trash2 className="h-3.5 w-3.5" /></button> : null}
        </div>
      ))}</div> : <p className="mt-3 text-xs text-[var(--app-muted)]">Звуки открываются на 3-м уровне группы и слышны всем участникам комнаты.</p>}
      {canManage && upload && data && data.limit > 0 && data.items.length < data.limit ? <div className="mt-3 space-y-2 border-t border-[var(--app-border)] pt-3">
        <input className="voople-input w-full" value={name} onChange={(event) => setName(event.target.value.replace(/[^\p{L}\p{N}_ -]/gu, "").slice(0, 32))} placeholder="Название звука" minLength={2} maxLength={32} />
        <label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-[var(--app-radius-md)] border border-[var(--app-border)] px-3 text-xs font-medium hover:bg-[var(--app-surface-soft)]"><Plus className="h-4 w-4" />{file ? file.name : "MP3, M4A, OGG, WAV или WebM · до 1 МБ"}<input type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        <label className="flex items-start gap-2 text-[11px] leading-4 text-[var(--app-muted)]"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} className="mt-0.5" />У меня есть права или лицензия на использование этого файла.</label>
        <Button type="button" variant="secondary" className="w-full" disabled={Boolean(pending) || !file || name.trim().length < 2 || !rightsConfirmed} onClick={() => void submit()}>{pending === "create" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Добавить звук</Button>
      </div> : null}
      {error ? <p className="mt-2 text-xs text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}
