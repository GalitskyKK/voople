"use client";

import { ExternalLink, Flag, ShieldX, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { REPORT_REASON_LABELS, type ReportReasonCode } from "@/lib/moderation/report";
import { parseDatabaseDate } from "@/lib/format/database-date";
import { trpc } from "@/lib/trpc/client";

const subjectLabels = {
  post: "публикация",
  message: "сообщение",
  profile: "профиль",
  group: "группа",
} as const;

export function AdminModerationPage() {
  const [message, setMessage] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const reports = trpc.admin.pendingModerationReports.useQuery({ limit: 50 }, { retry: false });
  const moderate = trpc.admin.moderateReport.useMutation({
    onSuccess: async () => {
      setMessage("Решение сохранено в журнале аудита.");
      await Promise.all([
        utils.admin.pendingModerationReports.invalidate(),
        utils.admin.overview.invalidate(),
      ]);
    },
    onError: (error) => setMessage(error.message),
  });

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2"><Flag className="h-5 w-5 text-(--theme-accent)" /><h2 className="text-xl font-semibold">Очередь модерации</h2></div>
        <p className="mt-1 text-sm text-[var(--app-muted)]">Жалоба сама ничего не скрывает. Решения привязаны к администратору и пишутся в аудит.</p>
      </header>
      {message ? <p className="rounded-xl border border-[var(--app-border)] px-4 py-3 text-sm" role="status">{message}</p> : null}
      {reports.error ? <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{reports.error.message}. Проверьте миграцию 35.</p> : null}
      {reports.isLoading ? <p className="text-sm text-[var(--app-muted)]">Загружаем жалобы…</p> : null}
      {reports.data?.length === 0 ? <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-8 text-center"><ShieldX className="mx-auto h-7 w-7 text-emerald-400" /><p className="mt-3 font-medium">Очередь пуста</p></div> : null}

      <div className="space-y-3">
        {reports.data?.map((report) => (
          <article key={report.id} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <p className="text-xs text-[var(--app-muted)]">{subjectLabels[report.subjectType]} · @{report.reporter.username} · {parseDatabaseDate(report.createdAt).toLocaleString("ru-RU")}</p>
                <p className="text-sm font-medium">{report.subject?.title ?? "Контент уже недоступен"}</p>
                {report.subject?.excerpt ? <p className="max-w-2xl whitespace-pre-wrap text-sm">{report.subject.excerpt}</p> : null}
                <p className="text-sm text-[var(--app-muted)]">Причина: {REPORT_REASON_LABELS[report.reasonCode as ReportReasonCode] ?? report.reasonCode}{report.details ? ` · ${report.details}` : ""}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {report.subject?.href ? <Link href={report.subject.href} target="_blank" className="inline-flex h-8 items-center justify-center gap-2 rounded-[var(--app-radius-md)] border border-[var(--app-border)] px-3 text-sm font-medium"><ExternalLink className="h-4 w-4" />Открыть</Link> : null}
                <Button variant="secondary" size="sm" disabled={moderate.isPending} onClick={() => moderate.mutate({ reportId: report.id, action: "dismiss" })}>Отклонить</Button>
                {report.subject?.removable ? <Button size="sm" disabled={moderate.isPending} className="bg-red-600 hover:bg-red-500" onClick={() => { if (window.confirm("Удалить этот контент навсегда? Действие будет записано в аудит.")) moderate.mutate({ reportId: report.id, action: "remove_content" }); }}><Trash2 className="h-4 w-4" />Удалить контент</Button> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
