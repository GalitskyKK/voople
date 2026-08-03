import { useEffect, useState } from "react";

import type { UserSearchHit } from "@/types/search";

type UseGroupChatCreatorOptions = {
  currentUserId: string;
  searchUsers: (query: string) => Promise<UserSearchHit[]>;
  createGroup: (input: { name: string; memberIds: string[] }) => Promise<string>;
  onCreated: (chatId: string) => void;
};

export function useGroupChatCreator({
  currentUserId,
  searchUsers,
  createGroup,
  onCreated,
}: UseGroupChatCreatorOptions) {
  const [open, setOpenState] = useState(false);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserSearchHit[]>([]);
  const [selected, setSelected] = useState<UserSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let active = true;
    const timer = window.setTimeout(() => {
      void searchUsers(query.trim())
        .then((result) => {
          if (active) setUsers(result.filter((user) => user.id !== currentUserId));
        })
        .catch((searchError: unknown) => {
          if (active) {
            setError(
              searchError instanceof Error
                ? searchError.message
                : "Не удалось выполнить поиск",
            );
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
  }, [currentUserId, open, query, searchUsers]);

  const reset = () => {
    setOpenState(false);
    setName("");
    setQuery("");
    setUsers([]);
    setSelected([]);
    setError(null);
    setSearching(false);
    setCreating(false);
  };

  const close = () => {
    if (!creating) reset();
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    setUsers([]);
    setError(null);
    setSearching(true);
  };

  const setOpen = (value: boolean) => {
    setOpenState(value);
    if (value) setSearching(true);
  };

  const toggleUser = (user: UserSearchHit) => {
    setSelected((current) =>
      current.some((item) => item.id === user.id)
        ? current.filter((item) => item.id !== user.id)
        : current.length < 19
          ? [...current, user]
          : current,
    );
  };

  const submit = async () => {
    if (name.trim().length < 2 || creating) return;
    setCreating(true);
    setError(null);
    try {
      const chatId = await createGroup({
        name: name.trim(),
        memberIds: selected.map((user) => user.id),
      });
      reset();
      onCreated(chatId);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Не удалось создать группу",
      );
      setCreating(false);
    }
  };

  return {
    canCreate: name.trim().length >= 2 && !creating,
    changeQuery,
    close,
    creating,
    error,
    name,
    open,
    query,
    searching,
    selected,
    setName,
    setOpen,
    submit,
    toggleUser,
    users,
  };
}
