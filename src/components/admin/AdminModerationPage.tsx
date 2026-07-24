"use client";

import { ExternalLink, Flag, ShieldX, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { parseDatabaseDate } from "@/lib/format/database-date";
import { trpc } from "@/lib/trpc/client";

export function AdminModerationPage() {
  const [message, setMessage] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const reports = trpc.admin.pendingPostReports.useQuery({ limit: 50 }, { retry: false });
  const moderate = trpc.admin.moderatePostReport.useMutation({
    onSuccess: async () => {
      setMessage("Решение сохранено в журнале аудита.");
      await Promise.all([
        utils.admin.pendingPostReports.invalidate(),
        utils.admin.overview.invalidate(),
      ]);
    },
    onError: (error) => setMessage(error.message),
  });

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-(--theme-accent)" />
          <h2 className="text-xl font-semibold">Очередь модерации</h2>
        </div>
        <p className="mt-1 text-sm text-[var(--app-muted)]">
          Жалоба сама ничего не скрывает. Каждое решение привязано к администратору и пишется в неизменяемый журнал.
        </p>
      </header>

      {message ? (
        <p className="rounded-xl border border-[var(--app-border)] px-4 py-3 text-sm">{message}</p>
      ) : null}
      {reports.error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {reports.error.message}. Проверьте, что применена миграция 26.
        </p>
      ) : null}
      {reports.isLoading ? <p className="text-sm text-[var(--app-muted)]">Загружаем жалобы…</p> : null}
      {reports.data?.length === 0 ? (
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-8 text-center">
          <ShieldX className="mx-auto h-7 w-7 text-emerald-400" />
          <p className="mt-3 font-medium">Очередь пуста</p>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Новых жалоб на публикации нет.</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {reports.data?.map((report) => (
          <article key={report.id} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <p className="text-xs text-[var(--app-muted)]">
                  Жалоба от @{report.reporter.username} · {parseDatabaseDate(report.createdAt).toLocaleString("ru-RU")}
                </p>
                {report.post ? (
                  <>
                    <p className="text-sm font-medium">
                      Автор: {report.post.authorDisplayName} · @{report.post.authorUsername}
                    </p>
                    <p className="max-w-2xl whitespace-pre-wrap text-sm">
                      {report.post.text || (report.post.hasMedia ? "Публикация с медиа без текста" : "Пустая публикация")}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-amber-300">Публикация уже недоступна.</p>
                )}
                <p className="text-sm text-[var(--app-muted)]">
                  Причина: {report.reason || "Пользователь не указал причину"}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {report.post ? (
                  <Link
                    href={`/post/${report.postId}`}
                    target="_blank"
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 text-sm font-medium transition-colors hover:border-[var(--app-border-strong)]"
                  >
                    <ExternalLink className="h-4 w-4" /> Открыть
                  </Link>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={moderate.isPending}
                  onClick={() => moderate.mutate({ reportId: report.id, action: "dismiss" })}
                >
                  Отклонить
                </Button>
                <Button
                  size="sm"
                  disabled={moderate.isPending || !report.post}
                  className="bg-red-600 hover:bg-red-500"
                  onClick={() => {
                    if (!window.confirm("Удалить публикацию навсегда? Действие будет записано в аудит.")) return;
                    moderate.mutate({ reportId: report.id, action: "remove_post" });
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Удалить пост
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
