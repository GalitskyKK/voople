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
import type { ChatGroupAuditEntryView, ChatGroupMemberView, GroupCommunityView, GroupCustomizationInput, GroupEmojiView, GroupJoinPolicy, GroupJoinRequestView, GroupSoundView, GroupVisibility } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";
import type { GroupDiscoveryProfileView, InterestCatalogView } from "@/types/social";

import { GroupChatMemberPicker } from "./GroupChatMemberPicker";
import { GroupAuditLog } from "./GroupAuditLog";
import { GroupBoostPanel } from "./GroupBoostPanel";
import { GroupCommunityPanel } from "./GroupCommunityPanel";
import { GroupEmojiManager } from "./GroupEmojiManager";
import { GroupInviteLinkPanel } from "./GroupInviteLinkPanel";
import { GroupMembersList } from "./GroupMembersList";
import { GroupRolesOverview } from "./GroupRolesOverview";
import { GroupTopicsSettings } from "./GroupTopicsSettings";
import { GroupVisibilitySettings } from "./GroupVisibilitySettings";
import { GroupAvatar } from "./GroupAvatar";
import { GroupManagementTrigger } from "./GroupManagementTrigger";
import { GroupSoundManager } from "./GroupSoundManager";
import { GroupNameEditor } from "./GroupNameEditor";
import { GroupJoinRequestsPanel } from "./GroupJoinRequestsPanel";
import { GroupDiscoverySettingsPanel } from "@/components/social/GroupDiscoverySettingsPanel";
import {
  GroupSettingsNavigation,
  type GroupSettingsSection,
} from "./GroupSettingsNavigation";

export type GroupManagementProps = {
  chatId: string;
  chatName: string;
  memberCount: number;
  groupIcon: string | null;
  groupAvatarUrl: string | null;
  groupAccentColor: string | null;
  groupTag: string | null;
  triggerVariant?: "toolbar" | "identity";
  viewerRole: "owner" | "admin" | "member";
  canManage: boolean;
  topicsEnabled: boolean;
  topicsLayout: "tabs" | "list";
  groupVisibility: GroupVisibility;
  joinPolicy: GroupJoinPolicy;
  inviteBaseUrl?: string;
  loadMembers: () => Promise<ChatGroupMemberView[]>;
  loadAudit: () => Promise<ChatGroupAuditEntryView[]>;
  searchContacts: (query: string) => Promise<UserSearchHit[]>;
  addMembers: (memberIds: string[]) => Promise<unknown>;
  createInvite: () => Promise<{ token: string }>;
  revokeInvite: (token: string) => Promise<unknown>;
  updateTopics: (enabled: boolean, layout: "tabs" | "list") => Promise<unknown>;
  updateVisibility: (visibility: GroupVisibility, joinPolicy: GroupJoinPolicy) => Promise<unknown>;
  loadJoinRequests: () => Promise<GroupJoinRequestView[]>;
  resolveJoinRequest: (requestId: string, approve: boolean) => Promise<unknown>;
  loadInterestCatalog: () => Promise<InterestCatalogView>;
  loadDiscoveryProfile: () => Promise<GroupDiscoveryProfileView>;
  updateDiscoveryProfile: (value: Omit<GroupDiscoveryProfileView, "topicLimit">) => Promise<GroupDiscoveryProfileView>;
  updateName: (name: string) => Promise<{ name: string }>;
  loadCommunity: () => Promise<GroupCommunityView>;
  updateCustomization: (input: GroupCustomizationInput) => Promise<GroupCommunityView>;
  uploadAvatar?: (file: File) => Promise<{ mediaKey: string; previewUrl: string }>;
  uploadBanner?: (file: File) => Promise<{ mediaKey: string; previewUrl: string }>;
  loadEmojis: () => Promise<{ items: GroupEmojiView[]; limit: number }>;
  createEmoji: (input: { name: string; uploadKey: string; rightsConfirmed: true }) => Promise<GroupEmojiView>;
  deleteEmoji: (emojiId: string) => Promise<unknown>;
  uploadEmoji?: (file: File) => Promise<{ mediaKey: string }>;
  loadSounds: () => Promise<{ items: GroupSoundView[]; limit: number }>;
  createSound: (input: { name: string; uploadKey: string; rightsConfirmed: true }) => Promise<GroupSoundView>;
  deleteSound: (soundId: string) => Promise<unknown>;
  uploadSound?: (file: File) => Promise<{ mediaKey: string }>;
  setBoost: (enabled: boolean, slot?: 1 | 2 | 3, idempotencyKey?: string) => Promise<GroupCommunityView>;
  setPerk: (perkId: string, enabled: boolean) => Promise<GroupCommunityView>;
  removeMember: (memberId: string) => Promise<unknown>;
  changeMemberRole: (memberId: string, role: "admin" | "member") => Promise<unknown>;
  transferOwnership: (memberId: string) => Promise<unknown>;
  leaveGroup: () => Promise<unknown>;
  deleteGroup: () => Promise<unknown>;
  onMembersChanged?: () => void;
  onGroupClosed: () => void;
  renderAvatar: (user: UserSearchHit) => ReactNode;
  presentation?: "sheet" | "page";
  onBack?: () => void;
};

export function GroupManagementSheetView(props: GroupManagementProps) {
  const isPage = props.presentation === "page";
  const state = useGroupManagementSheet({ ...props, alwaysActive: isPage });
  const [section, setSection] = useState<GroupSettingsSection>("main");
  const [groupName, setGroupName] = useState(props.chatName);
  const slotsLeft = Math.max(0, 20 - state.members.length);

  const content = state.adding ? (
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
            <div className={isPage ? "flex items-center gap-3" : "flex items-center gap-3 pr-10"}>
              <GroupAvatar name={groupName} avatarUrl={props.groupAvatarUrl} icon={props.groupIcon} accentColor={props.groupAccentColor} size="lg" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--theme-accent)">Настройки сообщества</p>
                <h2 className="mt-1 truncate text-xl font-semibold">{groupName}</h2>
                <p className="mt-1 text-sm text-[var(--app-muted)]">{state.members.length} из 20 участников</p>
              </div>
            </div>

            <div className={isPage ? "mt-6 grid min-h-0 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]" : ""}>
              <GroupSettingsNavigation section={section} onChange={setSection} canManage={props.canManage} layout={isPage ? "sidebar" : "tabs"} className={isPage ? "lg:sticky lg:top-0 lg:self-start" : "mt-4"} />
              <div className="min-w-0">
            {section === "main" ? (
              <>
                <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
                  <h3 className="font-semibold">Основное</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">Название, доступность и базовые параметры сообщества. Внешний вид настраивается отдельно, чтобы изменения было проще проверить перед сохранением.</p>
                </section>
                <GroupNameEditor value={groupName} canManage={props.canManage} save={props.updateName} onChanged={(name) => { setGroupName(name); props.onMembersChanged?.(); }} />
                <GroupVisibilitySettings value={props.groupVisibility} joinPolicy={props.joinPolicy} canManage={props.canManage} onChange={props.updateVisibility} />
                <GroupDiscoverySettingsPanel canManage={props.canManage} loadCatalog={props.loadInterestCatalog} load={props.loadDiscoveryProfile} save={props.updateDiscoveryProfile} />
              </>
            ) : null}

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
                changingRoleMemberId={state.changingRoleMemberId}
                transferringOwnerMemberId={state.transferringOwnerMemberId}
                onChangeRole={(member) => void state.changeRole(member)}
                onTransferOwnership={(member) => void state.transferOwner(member)}
                onRemoveMember={(member) => void state.remove(member)}
              />
            ) : null}

            {section === "roles" ? <GroupRolesOverview members={state.members} /> : null}

            {section === "sections" ? <GroupTopicsSettings enabled={props.topicsEnabled} canManage={props.canManage} onChange={props.updateTopics} /> : null}

            {section === "appearance" ? (
              <GroupCommunityPanel
                canManage={props.canManage}
                groupName={groupName}
                load={props.loadCommunity}
                save={props.updateCustomization}
                uploadAvatar={props.uploadAvatar}
                uploadBanner={props.uploadBanner}
                onChanged={props.onMembersChanged}
              />
            ) : null}

            {section === "members" && props.canManage ? (
              <GroupJoinRequestsPanel load={props.loadJoinRequests} resolve={props.resolveJoinRequest} />
            ) : null}

            {section === "media" ? <>
              <GroupEmojiManager
                canManage={props.canManage}
                load={props.loadEmojis}
                create={props.createEmoji}
                remove={props.deleteEmoji}
                upload={props.uploadEmoji}
              />
              <GroupSoundManager
                canManage={props.canManage}
                load={props.loadSounds}
                create={props.createSound}
                remove={props.deleteSound}
                upload={props.uploadSound}
              />
            </> : null}

            {section === "boosts" ? <GroupBoostPanel load={props.loadCommunity} setBoost={props.setBoost} setPerk={props.setPerk} onChanged={props.onMembersChanged} /> : null}

            {section === "links" && props.canManage ? (
              <div className="mt-4">
                <GroupInviteLinkPanel
                  inviteBaseUrl={props.inviteBaseUrl}
                  createInvite={props.createInvite}
                  revokeInvite={props.revokeInvite}
                  loadVanityInvite={async () => {
                    const community = await props.loadCommunity();
                    return community.boostUnlocksVanityInvite
                      ? community.vanityInviteSlug
                      : null;
                  }}
                />
              </div>
            ) : null}

            {section === "audit" && props.canManage ? (
              <GroupAuditLog load={props.loadAudit} />
            ) : null}

            {section === "roles" ? <div className="mt-5 border-t border-[var(--app-border)] pt-4">
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
              </div>
            </div>
          </>
        );

  const body = <>{content}{state.error ? <p className="mt-3 text-sm text-red-400" role="alert">{state.error}</p> : null}</>;

  if (isPage) {
    return (
      <div className="voople-scroll min-h-0 flex-1 overflow-y-auto bg-[var(--app-canvas)] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <button type="button" onClick={props.onBack} className="mb-5 inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-[var(--app-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]">
            <ArrowLeft className="h-4 w-4" /> Вернуться в чат
          </button>
          {body}
        </div>
      </div>
    );
  }

  return <>
    <GroupManagementTrigger variant={props.triggerVariant ?? "toolbar"} onClick={() => state.setOpen(true)} chatName={groupName} memberCount={props.memberCount} groupIcon={props.groupIcon} groupAvatarUrl={props.groupAvatarUrl} groupAccentColor={props.groupAccentColor} groupTag={props.groupTag} />
    <Sheet open={state.open} onClose={state.close} className="max-w-lg" ariaLabel={state.adding ? "Добавление участников" : "Участники группы"}>{body}</Sheet>
  </>;
}
