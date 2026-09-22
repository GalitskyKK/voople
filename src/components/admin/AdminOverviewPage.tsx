"use client";

import {
  Activity,
  AlertTriangle,
  Bot,
  CreditCard,
  Database,
  FileText,
  GitFork,
  HardDrive,
  Repeat2,
  ShieldCheck,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

const formatter = new Intl.NumberFormat("ru-RU");
const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" });

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function AdminOverviewPage() {
  const overview = trpc.admin.overview.useQuery(undefined, {
    refetchInterval: 60_000,
    retry: false,
  });

  if (overview.isLoading) {
    return <p className="text-sm text-[var(--app-muted)]">Проверяем состояние Voople…</p>;
  }

  if (overview.error || !overview.data) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        Не удалось загрузить состояние: {overview.error?.message ?? "нет данных"}. Проверьте, что применена миграция 26.
      </div>
    );
  }

  const { metrics, product, services } = overview.data;
  const latestWeek = product.weekly[0] ?? null;
  const metricCards = [
    { label: "Пользователи", value: metrics.usersTotal, detail: `+${metrics.usersDay} за сутки`, icon: Users },
    { label: "Регистрации за 7 дней", value: metrics.usersWeek, detail: "Новые профили", icon: UserPlus },
    { label: "Публикации", value: metrics.postsTotal, detail: `+${metrics.postsDay} за сутки · +${metrics.postsWeek} за 7 дней`, icon: FileText },
    { label: "Активные Voople+", value: metrics.activeSubscriptions, detail: "Подписка не истекла", icon: ShieldCheck },
    { label: "Ожидают модерации", value: metrics.pendingReports, detail: "Неразобранные жалобы", icon: AlertTriangle },
  ];
  const serviceCards = [
    { label: "База данных", state: services.database, icon: Database },
    { label: "Объектное хранилище", state: services.objectStorage, icon: HardDrive },
    { label: "Платежи", state: services.payments, icon: CreditCard },
    { label: "Антибот-защита", state: services.captcha, icon: Bot },
  ];

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-(--theme-accent)" />
          <h2 className="text-xl font-semibold">Состояние и активность</h2>
        </div>
        <p className="mt-1 text-sm text-[var(--app-muted)]">
          Операционные показатели без персональных данных. Обновляются раз в минуту.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
            <Icon className="h-4 w-4 text-(--theme-accent)" />
            <p className="mt-4 text-2xl font-semibold tabular-nums">{formatter.format(value)}</p>
            <p className="mt-1 text-sm font-medium">{label}</p>
            <p className="mt-1 text-xs text-[var(--app-muted)]">{detail}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3" aria-labelledby="group-product-metrics">
        <div>
          <h3 id="group-product-metrics" className="font-semibold">Групповой продукт</h3>
          <p className="mt-1 text-xs text-[var(--app-muted)]">
            Серверные события без raw Group, Room и User ID. Неделя начинается в понедельник UTC.
          </p>
        </div>
        {latestWeek ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ProductMetric icon={UsersRound} label="Активные группы" value={latestWeek.activeGroups} detail="с voice activity за неделю" />
              <ProductMetric icon={Repeat2} label="Повторяющийся войс" value={latestWeek.recurringVoiceGroups} detail={`${percent(latestWeek.recurringVoiceGroups, latestWeek.activeGroups)}% активных групп`} />
              <ProductMetric icon={Users} label="Социальный войс" value={latestWeek.socialVoiceGroups} detail={`${percent(latestWeek.socialVoiceGroups, latestWeek.activeGroups)}% с 2+ участниками`} />
              <ProductMetric icon={GitFork} label="Switch rate" value={`${percent(latestWeek.roomSwitches, latestWeek.roomJoins)}%`} detail={`${latestWeek.roomSwitches} switch / ${latestWeek.roomJoins} joins`} />
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[var(--app-border)]">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="border-b border-[var(--app-border)] text-[var(--app-muted)]">
                  <tr><th className="px-4 py-3 font-medium">Неделя</th><th className="px-4 py-3 font-medium">Активные</th><th className="px-4 py-3 font-medium">2+ дня</th><th className="px-4 py-3 font-medium">2+ участника</th><th className="px-4 py-3 font-medium">Rooms</th><th className="px-4 py-3 font-medium">Joins</th><th className="px-4 py-3 font-medium">Switch</th></tr>
                </thead>
                <tbody>
                  {product.weekly.map((week) => (
                    <tr key={week.week} className="border-b border-[var(--app-border)] last:border-0">
                      <td className="px-4 py-3 font-medium">{dateFormatter.format(new Date(`${week.week}T00:00:00Z`))}</td>
                      <td className="px-4 py-3 tabular-nums">{formatter.format(week.activeGroups)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatter.format(week.recurringVoiceGroups)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatter.format(week.socialVoiceGroups)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatter.format(week.roomsCreated)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatter.format(week.roomJoins)}</td>
                      <td className="px-4 py-3 tabular-nums">{formatter.format(week.roomSwitches)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--app-border)] p-5 text-sm text-[var(--app-muted)]">
            Серверных Group-событий пока нет. Данные появятся после следующего production deploy и реального использования.
          </div>
        )}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <CohortPanel title="Активация за 24 часа" rows={product.activation.map((row) => ({ week: row.cohortWeek, total: row.groupsCreated, converted: row.socialVoiceWithin24h }))} convertedLabel="с social voice" />
        <CohortPanel title="W1 retention" rows={product.retention.map((row) => ({ week: row.cohortWeek, total: row.groupsCreated, converted: row.retainedW1 }))} convertedLabel="вернулись на 7–13 день" />
      </section>

      <section>
        <h3 className="mb-3 font-semibold">Зависимости</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {serviceCards.map(({ label, state, icon: Icon }) => {
            const ready = state === "operational" || state === "configured";
            return (
              <article key={label} className="flex items-center gap-3 rounded-2xl border border-[var(--app-border)] p-4">
                <Icon className="h-5 w-5 text-[var(--app-muted)]" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{label}</p>
                  <p className={ready ? "text-xs text-emerald-400" : "text-xs text-amber-400"}>
                    {ready ? "Настроено" : "Требует настройки"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-[var(--app-muted)]">
          Этот экран подтверждает доступность БД и наличие конфигурации. Для внешнего мониторинга нужны отдельные synthetic checks.
        </p>
      </section>
    </div>
  );
}

function ProductMetric({ icon: Icon, label, value, detail }: { icon: typeof Activity; label: string; value: number | string; detail: string }) {
  return (
    <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
      <Icon className="h-4 w-4 text-(--theme-accent)" aria-hidden="true" />
      <p className="mt-4 text-2xl font-semibold tabular-nums">{typeof value === "number" ? formatter.format(value) : value}</p>
      <p className="mt-1 text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs text-[var(--app-muted)]">{detail}</p>
    </article>
  );
}

function CohortPanel({ title, rows, convertedLabel }: { title: string; rows: Array<{ week: string; total: number; converted: number }>; convertedLabel: string }) {
  return (
    <article className="rounded-2xl border border-[var(--app-border)] p-4">
      <h3 className="font-semibold">{title}</h3>
      {rows.length > 0 ? (
        <div className="mt-4 space-y-3">
          {rows.slice(0, 6).map((row) => {
            const rate = percent(row.converted, row.total);
            return (
              <div key={row.week} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-xs">
                <time className="text-[var(--app-muted)]">{dateFormatter.format(new Date(`${row.week}T00:00:00Z`))}</time>
                <span className="h-1.5 overflow-hidden rounded-full bg-[var(--app-surface-soft)]"><i className="block h-full rounded-full bg-(--theme-accent)" style={{ width: `${rate}%` }} /></span>
                <strong className="min-w-12 text-right tabular-nums">{rate}%</strong>
                <small className="col-start-2 col-end-4 text-[var(--app-muted)]">{row.converted} из {row.total} · {convertedLabel}</small>
              </div>
            );
          })}
        </div>
      ) : <p className="mt-4 text-sm text-[var(--app-muted)]">Когорт пока нет.</p>}
    </article>
  );
}
