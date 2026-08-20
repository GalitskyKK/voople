import { Check, Crown, ShieldCheck, UserRound, X } from "lucide-react";

import type { ChatGroupMemberView } from "@/types/chat";

const ROLES = [
  {
    id: "owner",
    label: "Владелец",
    description: "Полный доступ, передача владения и удаление сообщества",
    icon: Crown,
    tone: "text-amber-400 bg-amber-400/10",
  },
  {
    id: "admin",
    label: "Администратор",
    description: "Участники, разделы, оформление, emoji, sounds и ссылки",
    icon: ShieldCheck,
    tone: "text-violet-400 bg-violet-400/10",
  },
  {
    id: "member",
    label: "Участник",
    description: "Сообщения, реакции и участие в комнатах",
    icon: UserRound,
    tone: "text-sky-400 bg-sky-400/10",
  },
] as const;

const PERMISSIONS = [
  ["Писать и реагировать", true, true, true],
  ["Создавать комнаты", true, true, true],
  ["Управлять участниками", true, true, false],
  ["Настраивать сообщество", true, true, false],
  ["Удалить сообщество", true, false, false],
] as const;

export function GroupRolesOverview({ members }: { members: ChatGroupMemberView[] }) {
  return (
    <section className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-5" aria-labelledby="group-roles-heading">
      <div>
        <h3 id="group-roles-heading" className="font-semibold">Роли и доступ</h3>
        <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">Три системные роли задают понятную и одинаковую модель прав в web и desktop.</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const count = members.filter((member) => member.role === role.id).length;
          return (
            <article key={role.id} className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${role.tone}`}><Icon className="h-4 w-4" /></span>
                <span className="text-lg font-semibold tabular-nums">{count}</span>
              </div>
              <strong className="mt-3 block text-sm">{role.label}</strong>
              <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">{role.description}</p>
            </article>
          );
        })}
      </div>

      <div className="voople-scroll mt-5 overflow-x-auto rounded-2xl border border-[var(--app-border)]">
        <table className="w-full min-w-[32rem] text-left text-xs">
          <thead className="bg-[var(--app-surface-soft)] text-[var(--app-muted)]">
            <tr><th className="px-3 py-2.5 font-medium">Возможность</th>{ROLES.map((role) => <th key={role.id} className="px-3 py-2.5 text-center font-medium">{role.label}</th>)}</tr>
          </thead>
          <tbody>
            {PERMISSIONS.map(([label, owner, admin, member]) => (
              <tr key={label} className="border-t border-[var(--app-border)]">
                <th className="px-3 py-2.5 font-medium">{label}</th>
                {[owner, admin, member].map((allowed, index) => <td key={`${label}-${index}`} className="px-3 py-2.5 text-center">{allowed ? <Check className="mx-auto h-4 w-4 text-emerald-500" aria-label="Разрешено" /> : <X className="mx-auto h-4 w-4 text-[var(--app-muted)]" aria-label="Недоступно" />}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-[var(--app-muted)]">Роль конкретного участника меняется в разделе «Участники» через меню строки.</p>
    </section>
  );
}
