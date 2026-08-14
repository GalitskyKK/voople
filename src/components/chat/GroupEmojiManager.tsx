"use client";

import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { GroupEmojiView } from "@/types/chat";

type EmojiList = { items: GroupEmojiView[]; limit: number };

export function GroupEmojiManager({
  canManage,
  load,
  create,
  remove,
  upload,
}: {
  canManage: boolean;
  load: () => Promise<EmojiList>;
  create: (input: { name: string; uploadKey: string; rightsConfirmed: true }) => Promise<GroupEmojiView>;
  remove: (emojiId: string) => Promise<unknown>;
  upload?: (file: File) => Promise<{ mediaKey: string }>;
}) {
  const [data, setData] = useState<EmojiList | null>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void load().then((value) => { if (active) setData(value); }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Не удалось загрузить эмодзи");
    });
    return () => { active = false; };
  }, [load]);

  const submit = async () => {
    if (!file || !upload || pending || !rightsConfirmed) return;
    setPending("create");
    setError(null);
    try {
      const uploaded = await upload(file);
      const emoji = await create({ name, uploadKey: uploaded.mediaKey, rightsConfirmed: true });
      setData((current) => current ? { ...current, items: [...current.items, emoji] } : current);
      setFile(null);
      setName("");
      setRightsConfirmed(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось добавить эмодзи");
    } finally {
      setPending(null);
    }
  };

  if (!data && !error) return <div className="mt-3 h-24 animate-pulse rounded-xl bg-[var(--app-surface-soft)]" />;

  return (
    <section className="mt-3 rounded-2xl border border-[var(--app-border)] p-3" aria-labelledby="group-emojis-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="group-emojis-title" className="text-sm font-medium">Эмодзи группы</h3>
          <p className="mt-0.5 text-xs text-[var(--app-muted)]">{data?.items.length ?? 0} из {data?.limit ?? 10}</p>
        </div>
      </div>

      {data?.items.length ? (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-7">
          {data.items.map((emoji) => (
            <div key={emoji.id} className="group relative grid aspect-square place-items-center rounded-xl bg-[var(--app-surface-soft)]" title={`:${emoji.name}:`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={emoji.url} alt={`:${emoji.name}:`} className="h-8 w-8 object-contain" loading="lazy" />
              {canManage ? <button type="button" disabled={Boolean(pending)} onClick={async () => {
                setPending(emoji.id); setError(null);
                try { await remove(emoji.id); setData((current) => current ? { ...current, items: current.items.filter((item) => item.id !== emoji.id) } : current); }
                catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось удалить эмодзи"); }
                finally { setPending(null); }
              }} className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white opacity-0 shadow transition group-hover:opacity-100 focus-visible:opacity-100" aria-label={`Удалить :${emoji.name}:`}><Trash2 className="h-3 w-3" /></button> : null}
            </div>
          ))}
        </div>
      ) : <p className="mt-3 text-xs text-[var(--app-muted)]">Администраторы могут добавить до 10 эмодзи даже без бустов.</p>}

      {canManage && upload && data && data.items.length < data.limit ? (
        <div className="mt-3 space-y-2 border-t border-[var(--app-border)] pt-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input className="voople-input" value={name} onChange={(event) => setName(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 32))} placeholder="Имя без двоеточий" minLength={2} maxLength={32} aria-label="Имя эмодзи" />
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--app-radius-md)] border border-[var(--app-border)] px-3 text-xs font-medium hover:bg-[var(--app-surface-soft)]">
              <ImagePlus className="h-4 w-4" />{file ? file.name : "PNG, WebP или GIF"}
              <input type="file" accept="image/png,image/webp,image/gif" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </label>
          </div>
          <label className="flex items-start gap-2 text-[11px] leading-4 text-[var(--app-muted)]"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} className="mt-0.5" />У меня есть права или лицензия на использование этого файла.</label>
          <Button type="button" variant="secondary" className="w-full" disabled={Boolean(pending) || !file || name.length < 2 || !rightsConfirmed} onClick={() => void submit()}>
            {pending === "create" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}Добавить эмодзи
          </Button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}
