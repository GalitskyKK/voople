import { useCallback, useEffect, useState } from "react";

import type { ChatGroupMemberView } from "@/types/chat";
import type { UserSearchHit } from "@/types/search";

type Options = {
  loadMembers: () => Promise<ChatGroupMemberView[]>;
  searchContacts: (query: string) => Promise<UserSearchHit[]>;
  addMembers: (memberIds: string[]) => Promise<unknown>;
  onMembersChanged?: () => void;
};

export function useGroupManagementSheet({
  loadMembers,
  searchContacts,
  addMembers,
  onMembersChanged,
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

  return {
    adding,
    close,
    contacts,
    error,
    loading,
    members,
    open,
    query,
    saving,
    searching,
    selected,
    setAdding,
    setError,
    setOpen,
    setQuery,
    submit,
    toggleContact,
  };
}
