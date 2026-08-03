"use client";

import {
  ArrowLeft,
  Loader2,
  LogOut,
  Trash2,
  UserMinus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useGroupManagementSheet } from "@/hooks/useGroupManagementSheet";
import type { ChatGroupMemberView } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";

import { GroupChatMemberPicker } from "./GroupChatMemberPicker";
import { GroupInviteLinkPanel } from "./GroupInviteLinkPanel";
import { GroupTopicsSettings } from "./GroupTopicsSettings";

type Props = {
  chatName: string;
  viewerRole: "owner" | "admin" | "member";
  canManage: boolean;
  topicsEnabled: boolean;
  topicsLayout: "tabs" | "list";
  inviteBaseUrl?: string;
  loadMembers: () => Promise<ChatGroupMemberView[]>;
  searchContacts: (query: string) => Promise<UserSearchHit[]>;
  addMembers: (memberIds: string[]) => Promise<unknown>;
  createInvite: () => Promise<{ token: string }>;
  revokeInvite: (token: string) => Promise<unknown>;
  updateTopics: (enabled: boolean, layout: "tabs" | "list") => Promise<unknown>;
  removeMember: (memberId: string) => Promise<unknown>;
  leaveGroup: () => Promise<unknown>;
  deleteGroup: () => Promise<unknown>;
  onMembersChanged?: () => void;
  onGroupClosed: () => void;
  renderAvatar: (user: UserSearchHit) => ReactNode;
};

function MembersList({
  members,
  renderAvatar,
  viewerRole,
  removingMemberId,
  onRemoveMember,
}: {
  members: ChatGroupMemberView[];
  renderAvatar: Props["renderAvatar"];
  viewerRole: Props["viewerRole"];
  removingMemberId: string | null;
  onRemoveMember: (member: ChatGroupMemberView) => void;
}) {
  return (
    <div className="voople-scroll mt-4 max-h-72 space-y-1 overflow-y-auto">
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
          {renderAvatar(member)}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{member.displayName}</p>
            <p className="truncate text-xs text-[var(--app-muted)]">@{member.username}</p>
          </div>
          {member.role !== "member" ? (
            <span className="rounded-full bg-[var(--app-accent-soft)] px-2 py-1 text-[0.65rem] font-semibold text-(--theme-accent)">
              {member.role === "owner" ? "владелец" : "админ"}
            </span>
          ) : null}
          {member.role !== "owner" &&
          (viewerRole === "owner" ||
            (viewerRole === "admin" && member.role === "member")) ? (
            <button
              type="button"
              onClick={() => onRemoveMember(member)}
              disabled={removingMemberId === member.id}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--app-muted)] transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
              aria-label={`Исключить ${member.displayName}`}
              title="Исключить из группы"
            >
              {removingMemberId === member.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserMinus className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function GroupManagementSheetView(props: Props) {
  const state = useGroupManagementSheet(props);
  const slotsLeft = Math.max(0, 20 - state.members.length);

  return (
    <>
      <button
        type="button"
        onClick={() => state.setOpen(true)}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border)] px-2.5 text-[var(--app-muted)] transition hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]"
        aria-label="Участники и разделы"
        title="Участники и разделы"
      >
        <UsersRound className="h-4 w-4" />
        <span className="hidden text-xs font-medium md:inline">Участники и разделы</span>
      </button>

      <Sheet
        open={state.open}
        onClose={state.close}
        className="max-w-lg"
        ariaLabel={state.adding ? "Добавление участников" : "Участники группы"}
      >
        {state.adding ? (
          <>
            <button
              type="button"
              onClick={() => state.setAdding(false)}
              className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад
            </button>
            <div className="pr-10">
              <h2 className="text-xl font-semibold">Добавить участников</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
                Здесь показаны взаимные подписки. Другим людям отправьте ссылку:
                они войдут только после своего подтверждения.
              </p>
            </div>
            <GroupChatMemberPicker
              query={state.query}
              users={state.contacts}
              selected={state.selected}
              searching={state.searching}
              onQueryChange={state.setQuery}
              onToggleUser={state.toggleContact}
              renderAvatar={props.renderAvatar}
              emptyLabel="Нет взаимных подписок, которых ещё нет в группе"
            />
            <Button
              type="button"
              className="mt-4 w-full"
              disabled={state.selected.length === 0 || state.saving}
              onClick={() => void state.submit()}
            >
              {state.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Добавить{state.selected.length ? ` · ${state.selected.length}` : ""}
            </Button>
          </>
        ) : (
          <>
            <div className="pr-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--theme-accent)">
                Группа
              </p>
              <h2 className="mt-1 truncate text-xl font-semibold">{props.chatName}</h2>
              <p className="mt-1 text-sm text-[var(--app-muted)]">
                {state.members.length} из 20 участников
              </p>
            </div>

            {props.canManage ? (
              <Button
                type="button"
                variant="secondary"
                className="mt-4 w-full"
                disabled={slotsLeft === 0 || state.loading}
                onClick={() => state.setAdding(true)}
              >
                <UserPlus className="h-4 w-4" />
                {slotsLeft === 0 ? "Группа заполнена" : "Добавить участников"}
              </Button>
            ) : null}

            {state.loading ? (
              <div className="mt-4 h-24 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" />
            ) : (
              <MembersList
                members={state.members}
                renderAvatar={props.renderAvatar}
                viewerRole={props.viewerRole}
                removingMemberId={state.removingMemberId}
                onRemoveMember={(member) => void state.remove(member)}
              />
            )}

            <GroupTopicsSettings
              enabled={props.topicsEnabled}
              canManage={props.canManage}
              onChange={props.updateTopics}
            />

            {props.canManage ? (
              <div className="mt-4">
                <GroupInviteLinkPanel
                  inviteBaseUrl={props.inviteBaseUrl}
                  createInvite={props.createInvite}
                  revokeInvite={props.revokeInvite}
                />
              </div>
            ) : null}

            <div className="mt-5 border-t border-[var(--app-border)] pt-4">
              {props.viewerRole === "owner" ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full text-red-400 hover:text-red-300"
                  disabled={state.destructivePending}
                  onClick={() => void state.destroyGroup()}
                >
                  {state.destructivePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Удалить группу
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full text-red-400 hover:text-red-300"
                  disabled={state.destructivePending}
                  onClick={() => void state.leave()}
                >
                  {state.destructivePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  Выйти из группы
                </Button>
              )}
            </div>
          </>
        )}

        {state.error ? <p className="mt-3 text-sm text-red-400" role="alert">{state.error}</p> : null}
      </Sheet>
    </>
  );
}
