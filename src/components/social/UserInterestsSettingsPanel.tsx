"use client";

import { Compass, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import type { InterestCatalogView, UserInterestSettingsView } from "@/types/social";

import { InterestPickerView } from "./InterestPickerView";

export function UserInterestsSettingsPanel({ loadCatalog, load, save }: {
  loadCatalog: () => Promise<InterestCatalogView>;
  load: () => Promise<UserInterestSettingsView>;
  save: (selectedSlugs: string[]) => Promise<UserInterestSettingsView>;
}) {
  const [catalog, setCatalog] = useState<InterestCatalogView | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([loadCatalog(), load()]).then(([nextCatalog, settings]) => {
      if (!active) return;
      const next = new Set(settings.selectedSlugs);
      setCatalog(nextCatalog); setSelected(next); setSaved(new Set(next));
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Не удалось загрузить интересы"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, loadCatalog]);

  const changed = selected.size !== saved.size || [...selected].some((slug) => !saved.has(slug));
  const submit = async () => {
    if (!changed || pending) return;
    setPending(true); setError(null);
    try {
      const result = await save([...selected]);
      const next = new Set(result.selectedSlugs);
      setSelected(next); setSaved(new Set(next));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить интересы"); }
    finally { setPending(false); }
  };

  return (
    <section className="settings-section" aria-labelledby="interests-settings-title">
      <div className="settings-section__header"><Compass className="h-5 w-5" /><div><h2 id="interests-settings-title">Интересы</h2><p>До 10 тем для рекомендаций людей, групп и событий.</p></div></div>
      {loading ? <div className="h-40 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" /> : catalog ? <InterestPickerView catalog={catalog} selected={selected} limit={10} disabled={pending} onToggle={(slug) => setSelected((current) => { const next = new Set(current); if (next.has(slug)) next.delete(slug); else next.add(slug); return next; })} /> : null}
      <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-[var(--app-muted)]">Выбрано {selected.size} из 10</p><Button type="button" size="sm" disabled={!changed || pending || loading} onClick={() => void submit()}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Сохранить</Button></div>
      {error ? <p className="mt-3 text-sm text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}
