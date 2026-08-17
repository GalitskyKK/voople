"use client";

import { Headphones, MessageCircle, Search, Settings, ShieldCheck, UsersRound } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { SectionPageHeader } from "@/components/layout/SectionPageHeader";

export type HelpDestinationRenderer = (props: {
  href: string;
  className: string;
  children: ReactNode;
}) => ReactNode;

const HELP_SECTIONS = [
  {
    id: "messages",
    title: "Сообщения и группы",
    icon: MessageCircle,
    items: [
      ["Как начать диалог?", "Откройте «Чаты», нажмите поиск и найдите пользователя по имени или @username. Личный диалог создастся после первого сообщения."],
      ["Как добавить человека в группу?", "Нажмите название группы → «Люди». Напрямую добавляются взаимные подписчики; остальным отправьте ссылку-приглашение."],
      ["Что такое разделы?", "Разделы делят одну большую группу на отдельные обсуждения. Владелец или администратор включает их в настройках доступа группы."],
    ],
  },
  {
    id: "calls",
    title: "Комнаты и звонки",
    icon: Headphones,
    items: [
      ["Как открыть комнату?", "В шапке личного или группового чата нажмите «Комната»."],
      ["Не видно микрофон или камеру", "Проверьте разрешения Windows или браузера, затем заново выберите устройство в разделе «Звук и соединение»."],
      ["Демонстрация показывает чёрный экран", "Выберите конкретное окно или экран заново. Защищённое видео и некоторые системные окна Windows не разрешают захват."],
    ],
  },
  {
    id: "desktop",
    title: "Приложение для Windows",
    icon: Settings,
    items: [
      ["Как проверить обновления?", "Откройте «Настройки» в приложении. Обновление проверяется автоматически и также доступно вручную в разделе приложения."],
      ["Не работают глобальные горячие клавиши", "Глобальные сочетания доступны только в desktop-приложении. Проверьте, что сочетание включено и не занято другой программой."],
      ["Как полностью закрыть приложение?", "Откройте значок Вупл. в области уведомлений Windows и выберите «Выход». Обычное закрытие окна может свернуть приложение в фон — это настраивается в разделе «Приложение»."],
    ],
  },
  {
    id: "privacy",
    title: "Аккаунт и безопасность",
    icon: ShieldCheck,
    items: [
      ["Почему код входа нельзя сообщать другим?", "Код подтверждает вход в аккаунт. Вупл. никогда не просит переслать его в чате или назвать сотруднику поддержки."],
      ["Кто видит мой онлайн?", "Статус показывается согласно настройке приватности. Если точное время скрыто, другие увидят приблизительное состояние."],
      ["Как пожаловаться на публикацию?", "Откройте меню публикации и выберите жалобу. Она попадёт в закрытую очередь модерации."],
    ],
  },
] as const;

export function HelpCenterView({ renderDestination }: { renderDestination: HelpDestinationRenderer }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
  const sections = useMemo(() => HELP_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(([question, answer]) =>
      !normalizedQuery || `${question} ${answer}`.toLocaleLowerCase("ru-RU").includes(normalizedQuery),
    ),
  })).filter((section) => section.items.length > 0), [normalizedQuery]);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-5 py-4 lg:py-6">
      <SectionPageHeader eyebrow="Помощь" title="Справочный центр" description="Короткие ответы по чатам, комнатам, приложению и безопасности." />

      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--app-muted)]" aria-hidden />
        <span className="sr-only">Поиск по справке</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Например: чёрный экран или добавить участника" className="voople-input h-12 pl-12" />
      </label>

      <nav className="grid gap-3 sm:grid-cols-3" aria-label="Быстрые действия">
        {renderDestination({ href: "/messages", className: "voople-panel flex items-center gap-3 p-4 transition hover:border-(--theme-accent)/40", children: <><MessageCircle className="h-5 w-5 text-(--theme-accent)" /><span className="font-medium">Открыть чаты</span></> })}
        {renderDestination({ href: "/settings", className: "voople-panel flex items-center gap-3 p-4 transition hover:border-(--theme-accent)/40", children: <><Settings className="h-5 w-5 text-(--theme-accent)" /><span className="font-medium">Проверить настройки</span></> })}
        {renderDestination({ href: "/shop?tab=plus", className: "voople-panel flex items-center gap-3 p-4 transition hover:border-(--theme-accent)/40", children: <><UsersRound className="h-5 w-5 text-(--theme-accent)" /><span className="font-medium">Возможности Вупл+</span></> })}
      </nav>

      {sections.length ? (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {sections.map(({ id, title, icon: Icon, items }) => (
            <section key={id} className="voople-panel p-4 sm:p-5">
              <h2 className="flex items-center gap-2 font-semibold"><Icon className="h-5 w-5 text-(--theme-accent)" />{title}</h2>
              <div className="mt-3 divide-y divide-[var(--app-border)]">
                {items.map(([question, answer]) => (
                  <details key={question} className="group py-3">
                    <summary className="cursor-pointer list-none pr-5 text-sm font-medium marker:content-none">{question}</summary>
                    <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="voople-panel p-8 text-center"><p className="font-medium">Ничего не нашли</p><p className="mt-1 text-sm text-[var(--app-muted)]">Попробуйте более короткий запрос.</p></div>
      )}
    </div>
  );
}
