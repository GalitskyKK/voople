import { useCallback, useEffect, useState } from "react";

import type { ChatGroupMemberView } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";

type Options = {
  loadMembers: () => Promise<ChatGroupMemberView[]>;
  searchContacts: (query: string) => Promise<UserSearchHit[]>;
  addMembers: (memberIds: string[]) => Promise<unknown>;
  removeMember: (memberId: string) => Promise<unknown>;
  changeMemberRole: (memberId: string, role: "admin" | "member") => Promise<unknown>;
  transferOwnership: (memberId: string) => Promise<unknown>;
  leaveGroup: () => Promise<unknown>;
  deleteGroup: () => Promise<unknown>;
  onMembersChanged?: () => void;
  onGroupClosed: () => void;
};

export function useGroupManagementSheet({
  loadMembers,
  searchContacts,
  addMembers,
  removeMember,
  changeMemberRole,
  transferOwnership,
  leaveGroup,
  deleteGroup,
  onMembersChanged,
  onGroupClosed,
}: Options) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [members, setMembers] = useState<ChatGroupMemberView[]>([]);
  const [contacts, setContacts] = useState<UserSearchHit[]>([]);
  const [selected, setSelected] = useState<UserSearchHit[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [changingRoleMemberId, setChangingRoleMemberId] = useState<string | null>(null);
  const [transferringOwnerMemberId, setTransferringOwnerMemberId] = useState<string | null>(null);
  const [destructivePending, setDestructivePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMembers(await loadMembers());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить участников");
    } finally {
      setLoading(false);
    }
  }, [loadMembers]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void refreshMembers(), 0);
    return () => window.clearTimeout(timer);
  }, [open, refreshMembers]);

  useEffect(() => {
    if (!open || !adding) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchContacts(query.trim())
        .then((result) => {
          if (active) setContacts(result);
        })
        .catch((cause: unknown) => {
          if (active) {
            setError(cause instanceof Error ? cause.message : "Не удалось загрузить контакты");
          }
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [adding, open, query, searchContacts]);

  const close = () => {
    if (saving) return;
    setOpen(false);
    setAdding(false);
    setSelected([]);
    setQuery("");
    setContacts([]);
    setError(null);
  };

  const toggleContact = (contact: UserSearchHit) => {
    const availableSlots = Math.max(0, 20 - members.length);
    setSelected((current) =>
      current.some((item) => item.id === contact.id)
        ? current.filter((item) => item.id !== contact.id)
        : current.length < availableSlots
          ? [...current, contact]
          : current,
    );
  };

  const submit = async () => {
    if (selected.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      await addMembers(selected.map((contact) => contact.id));
      setAdding(false);
      setSelected([]);
      setQuery("");
      setContacts([]);
      await refreshMembers();
      onMembersChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось добавить участников");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (member: ChatGroupMemberView) => {
    if (removingMemberId || destructivePending) return;
    if (!window.confirm(`Исключить ${member.displayName} из группы?`)) return;
    setRemovingMemberId(member.id);
    setError(null);
    try {
      await removeMember(member.id);
      await refreshMembers();
      onMembersChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось исключить участника");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const changeRole = async (member: ChatGroupMemberView) => {
    if (changingRoleMemberId || destructivePending || member.role === "owner") return;
    const nextRole = member.role === "admin" ? "member" : "admin";
    const prompt = nextRole === "admin"
      ? `Назначить ${member.displayName} администратором группы?`
      : `Снять с ${member.displayName} роль администратора?`;
    if (!window.confirm(prompt)) return;
    setChangingRoleMemberId(member.id);
    setError(null);
    try {
      await changeMemberRole(member.id, nextRole);
      await refreshMembers();
      onMembersChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось изменить роль участника");
    } finally {
      setChangingRoleMemberId(null);
    }
  };

  const transferOwner = async (member: ChatGroupMemberView) => {
    if (transferringOwnerMemberId || destructivePending || member.role === "owner") return;
    if (!window.confirm(
      `Передать владение группой пользователю ${member.displayName}? Вы станете администратором, а отменить передачу сможет только новый владелец.`,
    )) return;
    setTransferringOwnerMemberId(member.id);
    setError(null);
    try {
      await transferOwnership(member.id);
      await refreshMembers();
      onMembersChanged?.();
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось передать владение группой");
    } finally {
      setTransferringOwnerMemberId(null);
    }
  };

  const leave = async () => {
    if (destructivePending || !window.confirm("Выйти из этой группы?")) return;
    setDestructivePending(true);
    setError(null);
    try {
      await leaveGroup();
      onGroupClosed();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось выйти из группы");
      setDestructivePending(false);
    }
  };

  const destroyGroup = async () => {
    if (
      destructivePending ||
      !window.confirm("Удалить группу и все сообщения без возможности восстановления?")
    ) return;
    setDestructivePending(true);
    setError(null);
    try {
      await deleteGroup();
      onGroupClosed();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось удалить группу");
      setDestructivePending(false);
    }
  };

  return {
    adding,
    changeRole,
    changingRoleMemberId,
    close,
    contacts,
    destructivePending,
    destroyGroup,
    error,
    leave,
    loading,
    members,
    open,
    query,
    remove,
    removingMemberId,
    saving,
    searching,
    selected,
    setAdding,
    setError,
    setOpen,
    setQuery,
    submit,
    transferOwner,
    transferringOwnerMemberId,
    toggleContact,
  };
}
