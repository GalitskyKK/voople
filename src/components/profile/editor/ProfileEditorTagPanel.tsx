"use client";

import { Check, UsersRound, X } from "lucide-react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileGroupTagVisual } from "@/components/profile/ProfileGroupTagVisual";
import { cn } from "@/lib/utils";

import type { ProfileEditorGroupTag } from "./profile-editor-models";

export function ProfileEditorTagPanel({
  tags,
  selected,
  loading,
  busy,
  onSelect,
}: {
  tags: ProfileEditorGroupTag[];
  selected: ProfileEditorGroupTag | null;
  loading: boolean;
  busy: boolean;
  onSelect: (tag: ProfileEditorGroupTag | null) => void;
}) {
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Тег рядом с вашим именем</p>
            <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--app-muted)]">
              Можно использовать один тег сообщества, в котором вы состоите. Он помогает узнавать своих, но не заменяет имя и статус.
            </p>
          </div>
          {selected ? <ProfileGroupTagVisual value={selected} /> : null}
        </div>
      </div>

      {selected ? (
        <button
          type="button"
          disabled={busy}
          className="profile-editor-tag profile-editor-tag--selected"
          onClick={() => onSelect(null)}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--theme-accent)_16%,var(--app-surface))]">
            <X className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <strong className="block text-sm">Не показывать тег</strong>
            <span className="mt-0.5 block text-xs text-[var(--app-muted)]">Снять {selected.tag} с профиля</span>
          </span>
        </button>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="Загружаем теги">
          {[0, 1].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" />)}
        </div>
      ) : null}

      {!loading && tags.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--app-border)] p-5 text-center">
          <UsersRound className="mx-auto h-7 w-7 text-[var(--app-muted)]" />
          <p className="mt-3 text-sm font-medium">Пока нет доступных тегов</p>
          <p className="mt-1 text-xs text-[var(--app-muted)]">Вступите в сообщество с настроенным тегом — оно появится здесь автоматически.</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {tags.map((tag) => {
          const active = selected?.chatId === tag.chatId;
          return (
            <button
              key={tag.chatId}
              type="button"
              disabled={busy}
              aria-pressed={active}
              onClick={() => onSelect(tag)}
              className={cn("profile-editor-tag", active && "profile-editor-tag--selected")}
              style={{ "--profile-tag-accent": tag.accentColor ?? "var(--theme-accent)" } as React.CSSProperties}
            >
              <span className="profile-editor-tag__cover" style={tag.bannerUrl ? { backgroundImage: `url(${tag.bannerUrl})` } : undefined} />
              <span className="relative z-10 flex min-w-0 flex-1 items-center gap-3 pt-8 text-left">
                <ProfileAvatar displayName={tag.groupName} animatedAvatarUrl={tag.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{tag.groupName}</strong>
                  <span className="mt-1 flex items-center gap-2 text-xs text-[var(--app-muted)]">
                    <ProfileGroupTagVisual value={tag} compact />
                    {tag.memberCount > 0 ? `${tag.memberCount.toLocaleString("ru-RU")} участников` : "Ваше сообщество"}
                  </span>
                </span>
                {active ? <Check className="h-5 w-5 shrink-0 text-(--theme-accent)" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
