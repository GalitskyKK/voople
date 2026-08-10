"use client";

import {
  ArrowLeft,
  Loader2,
  LogOut,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useGroupManagementSheet } from "@/hooks/useGroupManagementSheet";
import type { ChatGroupMemberView, GroupCommunityView } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";

import { GroupChatMemberPicker } from "./GroupChatMemberPicker";
import { GroupCommunityPanel } from "./GroupCommunityPanel";
import { GroupInviteLinkPanel } from "./GroupInviteLinkPanel";
import { GroupMembersList } from "./GroupMembersList";
import { GroupTopicsSettings } from "./GroupTopicsSettings";
import { GroupVisibilitySettings } from "./GroupVisibilitySettings";
import { GroupAvatar } from "./GroupAvatar";
import { GroupManagementTrigger } from "./GroupManagementTrigger";
import {
  GroupSettingsNavigation,
  type GroupSettingsSection,
} from "./GroupSettingsNavigation";

type Props = {
  chatName: string;
  memberCount: number;
  groupIcon: string | null;
  groupAvatarUrl: string | null;
  groupAccentColor: string | null;
  triggerVariant?: "toolbar" | "identity";
  viewerRole: "owner" | "admin" | "member";
  canManage: boolean;
  topicsEnabled: boolean;
  topicsLayout: "tabs" | "list";
  groupVisibility: "private" | "public";
  inviteBaseUrl?: string;
  loadMembers: () => Promise<ChatGroupMemberView[]>;
  searchContacts: (query: string) => Promise<UserSearchHit[]>;
  addMembers: (memberIds: string[]) => Promise<unknown>;
  createInvite: () => Promise<{ token: string }>;
  revokeInvite: (token: string) => Promise<unknown>;
  updateTopics: (enabled: boolean, layout: "tabs" | "list") => Promise<unknown>;
  updateVisibility: (visibility: "private" | "public") => Promise<unknown>;
  loadCommunity: () => Promise<GroupCommunityView>;
  updateCustomization: (input: { description: string | null; icon: string | null; publicSlug: string | null; accentColor: string | null; avatarKey?: string | null }) => Promise<GroupCommunityView>;
  uploadAvatar?: (file: File) => Promise<{ mediaKey: string; previewUrl: string }>;
  setBoost: (enabled: boolean) => Promise<GroupCommunityView>;
  removeMember: (memberId: string) => Promise<unknown>;
  leaveGroup: () => Promise<unknown>;
  deleteGroup: () => Promise<unknown>;
  onMembersChanged?: () => void;
  onGroupClosed: () => void;
  renderAvatar: (user: UserSearchHit) => ReactNode;
};

export function GroupManagementSheetView(props: Props) {
  const state = useGroupManagementSheet(props);
  const [section, setSection] = useState<GroupSettingsSection>("members");
  const slotsLeft = Math.max(0, 20 - state.members.length);

  return (
    <>
      <GroupManagementTrigger variant={props.triggerVariant ?? "toolbar"} onClick={() => state.setOpen(true)} chatName={props.chatName} memberCount={props.memberCount} groupIcon={props.groupIcon} groupAvatarUrl={props.groupAvatarUrl} groupAccentColor={props.groupAccentColor} />

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
            <div className="flex items-center gap-3 pr-10">
              <GroupAvatar name={props.chatName} avatarUrl={props.groupAvatarUrl} icon={props.groupIcon} accentColor={props.groupAccentColor} size="lg" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--theme-accent)">Группа</p>
                <h2 className="mt-1 truncate text-xl font-semibold">{props.chatName}</h2>
                <p className="mt-1 text-sm text-[var(--app-muted)]">{state.members.length} из 20 участников</p>
              </div>
            </div>

            <GroupSettingsNavigation section={section} onChange={setSection} />

            {section === "members" && props.canManage ? (
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

            {section === "members" && state.loading ? (
              <div className="mt-4 h-24 animate-pulse rounded-2xl bg-[var(--app-surface-soft)]" />
            ) : section === "members" ? (
              <GroupMembersList
                members={state.members}
                renderAvatar={props.renderAvatar}
                viewerRole={props.viewerRole}
                removingMemberId={state.removingMemberId}
                onRemoveMember={(member) => void state.remove(member)}
              />
            ) : null}

            {section === "access" ? <><GroupTopicsSettings
              enabled={props.topicsEnabled}
              canManage={props.canManage}
              onChange={props.updateTopics}
            />

            <GroupVisibilitySettings
              value={props.groupVisibility}
              canManage={props.canManage}
              onChange={props.updateVisibility}
            />
            </> : null}

            {section === "appearance" ? <GroupCommunityPanel
              canManage={props.canManage}
              groupName={props.chatName}
              load={props.loadCommunity}
              save={props.updateCustomization}
              setBoost={props.setBoost}
              uploadAvatar={props.uploadAvatar}
              onChanged={props.onMembersChanged}
            /> : null}

            {section === "invites" && props.canManage ? (
              <div className="mt-4">
                <GroupInviteLinkPanel
                  inviteBaseUrl={props.inviteBaseUrl}
                  createInvite={props.createInvite}
                  revokeInvite={props.revokeInvite}
                />
              </div>
            ) : null}

            {section === "access" ? <div className="mt-5 border-t border-[var(--app-border)] pt-4">
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
            </div> : null}
          </>
        )}

        {state.error ? <p className="mt-3 text-sm text-red-400" role="alert">{state.error}</p> : null}
      </Sheet>
    </>
  );
}
