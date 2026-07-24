"use client";

import {
  Activity,
  AlertTriangle,
  Bot,
  CreditCard,
  Database,
  FileText,
  HardDrive,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

const formatter = new Intl.NumberFormat("ru-RU");

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

  const { metrics, services } = overview.data;
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
