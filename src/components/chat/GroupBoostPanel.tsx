"use client";

import { Check, Image, Link2, LoaderCircle, Palette, Rocket, Shield, SmilePlus, Tag, Upload, Video } from "lucide-react";
import { useEffect, useState } from "react";

import { VooplePlusBadge } from "@/components/subscription/VooplePlusFeatureSurface";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { GroupPerkDefinition } from "@/lib/group-perks";
import type { GroupCommunityView } from "@/types/chat";
import { reportProductEvent } from "@/lib/telemetry/client";

export function GroupBoostPanel({
  load,
  setBoost,
  setPerk,
  onChanged,
}: {
  load: () => Promise<GroupCommunityView>;
  setBoost: (enabled: boolean, slot?: 1 | 2 | 3, idempotencyKey?: string) => Promise<GroupCommunityView>;
  setPerk: (perkId: string, enabled: boolean) => Promise<GroupCommunityView>;
  onChanged?: () => void;
}) {
  const [community, setCommunity] = useState<GroupCommunityView | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingPerkId, setPendingPerkId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void load()
      .then((value) => {
        if (active) setCommunity(value);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Не удалось загрузить бусты");
      });
    return () => {
      active = false;
    };
  }, [load]);

  const assign = async (enabled: boolean, slot?: 1 | 2 | 3) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      setCommunity(await setBoost(enabled, slot, crypto.randomUUID()));
      reportProductEvent("boost_assigned", { action: enabled ? "assign" : "remove" });
      onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось изменить буст");
    } finally {
      setPending(false);
    }
  };

  const togglePerk = async (perkId: string, enabled: boolean) => {
    if (pendingPerkId) return;
    setPendingPerkId(perkId);
    setError(null);
    try {
      setCommunity(await setPerk(perkId, enabled));
      reportProductEvent(enabled ? "perk_enabled" : "perk_disabled", { kind: perkId });
      onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось изменить perk");
    } finally {
      setPendingPerkId(null);
    }
  };

  if (!community && !error) {
    return <div className="h-40 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" />;
  }
  if (!community) return <p className="text-sm text-red-400">{error}</p>;

  const assignedHere = community.boostSlots.find((slot) => slot.assignedHere);
  const freeSlot = community.boostSlots.find((slot) => slot.chatId === null);
  const progress = Math.min(100, (community.boostCount / 24) * 100);
  const activePerks = community.perks.filter((perk) => perk.status === "active");
  const usedPoints = community.perkUsed;
  const nextMilestone = [1, 3, 6, 12, 24].find((milestone) => milestone > community.boostCount) ?? 24;

  const toggle = () => {
    if (community.boostedByMe && assignedHere) void assign(false, assignedHere.slot);
    else if (freeSlot) void assign(true, freeSlot.slot);
    else setError("Все три буста распределены. Выберите слот для переноса ниже.");
  };

  return (
    <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-5" aria-labelledby="group-boosts-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="group-boosts-title" className="text-lg font-semibold">Бусты сообщества</h2>
            <VooplePlusBadge locked={!community.canBoost && !community.boostedByMe} />
          </div>
          <p className="mt-1 text-sm text-[var(--app-muted)]">{community.boostCount} из 24 · текущий уровень {community.groupLevel}</p>
        </div>
        <Button type="button" variant={community.boostedByMe ? "secondary" : undefined} disabled={pending || (!community.canBoost && !community.boostedByMe)} onClick={toggle}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          {community.boostedByMe ? "Снять мой буст" : "Бустить"}
        </Button>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--app-surface-soft)]" aria-label={`Прогресс бустов: ${community.boostCount} из 24`}>
        <div className="h-full rounded-full bg-[var(--theme-accent)] transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-5 text-[10px] text-[var(--app-muted)]">
        {[1, 3, 6, 12, 24].map((level) => <span key={level} className="text-center">{level}</span>)}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <BoostMetric label="Всего" value={community.boostCount} />
        <BoostMetric label="Используется" value={usedPoints} />
        <BoostMetric label="Свободно" value={Math.max(0, community.perkCapacity - usedPoints)} />
      </div>
      <p className="mt-3 rounded-xl bg-[var(--app-surface-soft)] px-3 py-2 text-xs text-[var(--app-muted)]">
        Следующий milestone: <strong className="text-[var(--foreground)]">{nextMilestone}</strong>. Каждый Boost одновременно двигает шкалу и добавляет 1 point вместимости.
      </p>

      <div className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <div><h3 className="text-sm font-semibold">Перки сообщества</h3><p className="mt-0.5 text-xs text-[var(--app-muted)]">Активные, доступные и следующие возможности</p></div>
          <span className="text-xs text-[var(--app-muted)]">{activePerks.length} активно</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {community.perks.map((perk) => (
            <PerkCard
              key={perk.id}
              perk={perk}
              pending={pendingPerkId === perk.id}
              onToggle={() => void togglePerk(perk.id, !perk.selected)}
            />
          ))}
        </div>
      </div>

      <div className="mt-6"><h3 className="text-sm font-semibold">Мои слоты Вупл+</h3><p className="mt-0.5 text-xs text-[var(--app-muted)]">Распределите до трёх личных Boost между сообществами</p></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3" aria-label="Распределение бустов Вупл+">
        {community.boostSlots.map((slot) => {
          const canMove = Boolean(community.canBoost && !slot.cooldownUntil && !slot.assignedHere);
          const canRemove = slot.assignedHere;
          return (
            <button
              key={slot.slot}
              type="button"
              disabled={pending || (!canMove && !canRemove)}
              onClick={() => void assign(!slot.assignedHere, slot.slot)}
              className={cn(
                "rounded-2xl border p-3 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent)] disabled:cursor-not-allowed disabled:opacity-60",
                slot.assignedHere
                  ? "border-[var(--theme-accent)] bg-[var(--app-accent-soft)] text-[var(--theme-accent)]"
                  : "border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-muted)] enabled:hover:border-[var(--theme-accent)]",
              )}
            >
              <span className="block font-semibold">Буст {slot.slot}</span>
              <span className="mt-1 block">{slot.assignedHere ? "Эта группа" : slot.chatId === null ? "Свободен" : slot.cooldownUntil ? "Закреплён" : "Можно перенести"}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-5 text-[var(--app-muted)]">Свободный слот: {freeSlot ? `№${freeSlot.slot}` : "нет"}. Перенос назначенного слота доступен раз в 7 дней.</p>
      {error ? <p className="mt-3 text-xs text-red-400" role="alert">{error}</p> : null}
    </section>
  );
}

const PERK_ICONS = { palette: Palette, smile: SmilePlus, image: Image, upload: Upload, tag: Tag, link: Link2, roles: Shield, hd: Video } as const;

function PerkCard({
  perk,
  pending,
  onToggle,
}: {
  perk: GroupPerkDefinition & { selected: boolean; status: "active" | "available" | "locked" | "suspended" };
  pending: boolean;
  onToggle: () => void;
}) {
  const Icon = PERK_ICONS[perk.icon];
  const active = perk.status === "active";
  const statusLabel = active ? "Активен" : perk.status === "available" ? "Доступен" : perk.status === "suspended" ? "Приостановлен" : `Milestone ${perk.milestone}`;
  return (
    <article className={cn("flex items-start gap-3 rounded-2xl border p-3 transition", active ? "border-[color-mix(in_srgb,var(--theme-accent)_35%,var(--app-border))] bg-[var(--app-accent-soft)]" : "border-[var(--app-border)] bg-[var(--app-surface-soft)]", perk.status === "locked" && "opacity-70")}>
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", active ? "bg-[var(--theme-accent)] text-white" : "bg-[var(--app-surface)] text-[var(--app-muted)]")}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 text-xs font-semibold">{perk.name}{active ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : null}</span><span className="mt-0.5 block text-[11px] leading-4 text-[var(--app-muted)]">{perk.description}</span><span className="mt-2 block text-[10px] font-medium uppercase tracking-wide text-[var(--app-muted)]">{perk.cost} {perk.cost === 1 ? "point" : "points"} · {statusLabel}</span><Button type="button" size="sm" variant={perk.selected ? "secondary" : "ghost"} className="mt-2 h-7 px-2 text-[11px]" disabled={pending || perk.status === "locked"} onClick={onToggle}>{pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : perk.selected ? "Отключить" : "Включить"}</Button></span>
    </article>
  );
}

function BoostMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3"><strong className="block text-xl tabular-nums">{value}</strong><span className="text-[10px] uppercase tracking-wide text-[var(--app-muted)]">{label}</span></div>;
}
