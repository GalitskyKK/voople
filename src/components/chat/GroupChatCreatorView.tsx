"use client";

import { Loader2, UserPlus, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useGroupChatCreator } from "@/hooks/useGroupChatCreator";
import { cn } from "@/lib/utils";
import type { UserSearchHit } from "@/types/search";

import { GroupChatMemberPicker } from "./GroupChatMemberPicker";

type GroupChatCreatorViewProps = {
  compact?: boolean;
  currentUserId: string;
  searchUsers: (query: string) => Promise<UserSearchHit[]>;
  createGroup: (input: { name: string; memberIds: string[] }) => Promise<string>;
  onCreated: (chatId: string) => void;
  renderAvatar: (user: UserSearchHit) => ReactNode;
};

export function GroupChatCreatorView(props: GroupChatCreatorViewProps) {
  const { compact = false, renderAvatar } = props;
  const creator = useGroupChatCreator(props);

  return (
    <>
      <button
        type="button"
        onClick={() => creator.setOpen(true)}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-sm font-medium transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-accent-soft)]",
          compact ? "h-10 w-10 shrink-0" : "w-full px-3 py-2",
        )}
        aria-label="Создать группу"
        title="Создать группу"
      >
        <UserPlus className="h-4 w-4 text-(--theme-accent)" />
        {!compact ? "Новая группа" : null}
      </button>

      <Sheet
        open={creator.open}
        onClose={creator.close}
        className="max-w-xl"
        ariaLabel="Новая группа"
      >
        <div className="pr-10">
          <h2 className="text-xl font-semibold">Новая группа</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Название и минимум два собеседника. Добавить можно до 19 человек.
          </p>
        </div>

        <label className="mt-5 block">
          <span className="text-xs font-medium text-[var(--app-muted)]">Название</span>
          <input
            value={creator.name}
            onChange={(event) => creator.setName(event.target.value)}
            maxLength={50}
            placeholder="Например, Ночной эфир"
            className="voople-input mt-1.5 w-full"
          />
        </label>

        <GroupChatMemberPicker
          query={creator.query}
          users={creator.users}
          selected={creator.selected}
          searching={creator.searching}
          onQueryChange={creator.changeQuery}
          onToggleUser={creator.toggleUser}
          renderAvatar={renderAvatar}
        />

        {creator.error ? (
          <p className="mt-3 text-xs text-red-400" role="alert">
            {creator.error}
          </p>
        ) : null}
        <Button
          type="button"
          className="mt-4 w-full"
          disabled={!creator.canCreate}
          onClick={() => void creator.submit()}
        >
          {creator.creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UsersRound className="h-4 w-4" />
          )}
          Создать группу
        </Button>
      </Sheet>
    </>
  );
}
