"use client";

import { Loader2, Tags } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { GroupDiscoveryProfileView, InterestCatalogView } from "@/types/social";

import { InterestPickerView } from "./InterestPickerView";

export function GroupDiscoverySettingsPanel({ canManage, loadCatalog, load, save }: {
  canManage: boolean;
  loadCatalog: () => Promise<InterestCatalogView>;
  load: () => Promise<GroupDiscoveryProfileView>;
  save: (value: Omit<GroupDiscoveryProfileView, "topicLimit">) => Promise<GroupDiscoveryProfileView>;
}) {
  const [catalog, setCatalog] = useState<InterestCatalogView | null>(null);
  const [profile, setProfile] = useState<GroupDiscoveryProfileView | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([loadCatalog(), load()]).then(([nextCatalog, nextProfile]) => { if (active) { setCatalog(nextCatalog); setProfile(nextProfile); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Не удалось загрузить темы"); });
    return () => { active = false; };
  }, [load, loadCatalog]);
  if (!catalog || !profile) return <div className="mt-4 h-36 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" />;
  const selected = new Set(profile.topicSlugs);
  const submit = async () => {
    if (pending) return;
    setPending(true); setError(null);
    try { setProfile(await save({ primaryCategorySlug: profile.primaryCategorySlug, topicSlugs: profile.topicSlugs, language: profile.language, region: profile.region })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить темы"); }
    finally { setPending(false); }
  };
  return (
    <section className="mt-4 rounded-2xl border border-[var(--app-border)] p-4" aria-labelledby="group-discovery-title">
      <div className="flex items-start gap-3"><Tags className="mt-0.5 h-5 w-5 text-[var(--theme-accent)]" /><div><h3 id="group-discovery-title" className="font-semibold">Категория и темы</h3><p className="mt-1 text-sm text-[var(--app-muted)]">Помогают людям находить сообщество по интересам.</p></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-[var(--app-muted)]">Основная категория<select disabled={!canManage || pending} value={profile.primaryCategorySlug ?? ""} onChange={(event) => setProfile({ ...profile, primaryCategorySlug: event.target.value || null })} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--foreground)]"><option value="">Не выбрана</option>{catalog.categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label><label className="text-xs font-medium text-[var(--app-muted)]">Язык<input disabled={!canManage || pending} value={profile.language} onChange={(event) => setProfile({ ...profile, language: event.target.value.slice(0, 10) })} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--foreground)]" /></label><label className="text-xs font-medium text-[var(--app-muted)] sm:col-span-2">Регион — необязательно<input disabled={!canManage || pending} value={profile.region ?? ""} onChange={(event) => setProfile({ ...profile, region: event.target.value.slice(0, 64) || null })} placeholder="Например, Урал" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--foreground)]" /></label></div>
      <div className="mt-4"><InterestPickerView catalog={catalog} selected={selected} limit={profile.topicLimit} preferredCategorySlug={profile.primaryCategorySlug} disabled={!canManage || pending} onToggle={(slug) => setProfile((current) => current ? { ...current, topicSlugs: current.topicSlugs.includes(slug) ? current.topicSlugs.filter((item) => item !== slug) : [...current.topicSlugs, slug] } : current)} /></div>
      <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-[var(--app-muted)]">Темы: {profile.topicSlugs.length} из 5</p>{canManage ? <Button type="button" size="sm" disabled={pending} onClick={() => void submit()}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Сохранить</Button> : null}</div>
      {error ? <p className="mt-3 text-sm text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}
