"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { useBrowserOnline } from "@/hooks/useBrowserOnline";
import { trpc } from "@/lib/trpc/client";
import type {
  SavedMessageDraft,
  SavedMessageView,
} from "@/types/saved-messages";

import { SavedMessagesView } from "./SavedMessagesView";

export function SavedMessagesController({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const online = useBrowserOnline();
  const utils = trpc.useUtils();
  const listInput = useMemo(
    () => ({ limit: 30, query: deferredQuery || undefined }),
    [deferredQuery],
  );
  const me = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  const availability = trpc.savedMessages.availability.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const enabled = availability.data?.enabled === true;
  const messages = trpc.savedMessages.list.useInfiniteQuery(
    listInput,
    {
      enabled,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
      refetchOnWindowFocus: false,
    },
  );
  const create = trpc.savedMessages.create.useMutation();
  const edit = trpc.savedMessages.edit.useMutation();
  const remove = trpc.savedMessages.delete.useMutation();

  useEffect(() => {
    if (availability.data && !availability.data.enabled) onBack();
  }, [availability.data, onBack]);

  const refresh = async () => {
    await utils.savedMessages.list.invalidate();
  };
  const createMessage = async (
    draft: SavedMessageDraft,
    optimistic: SavedMessageView,
  ) => {
    await utils.savedMessages.list.cancel(listInput);
    const previous = utils.savedMessages.list.getInfiniteData(listInput);
    if (!deferredQuery) {
      utils.savedMessages.list.setInfiniteData(listInput, (current) => current ? {
        ...current,
        pages: current.pages.map((page, index) => ({
          ...page,
          items: index === 0
            ? [optimistic, ...page.items.filter((item) => item.id !== optimistic.id)]
            : page.items.filter((item) => item.id !== optimistic.id),
        })),
      } : current);
    }
    try {
      const saved = await create.mutateAsync(draft);
      utils.savedMessages.list.setInfiniteData(listInput, (current) => current ? {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => item.id === saved.id ? saved : item),
        })),
      } : current);
      void refresh();
      return saved;
    } catch (error) {
      if (previous) utils.savedMessages.list.setInfiniteData(listInput, previous);
      throw error;
    }
  };
  const editMessage = async (messageId: string, text: string) => {
    await utils.savedMessages.list.cancel(listInput);
    const previous = utils.savedMessages.list.getInfiniteData(listInput);
    utils.savedMessages.list.setInfiniteData(listInput, (current) => current ? {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        items: page.items.map((item) => item.id === messageId
          ? { ...item, text: text.trim() || null, editedAt: new Date().toISOString() }
          : item),
      })),
    } : current);
    try {
      const saved = await edit.mutateAsync({ messageId, text });
      utils.savedMessages.list.setInfiniteData(listInput, (current) => current ? {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => item.id === saved.id ? saved : item),
        })),
      } : current);
      void refresh();
      return saved;
    } catch (error) {
      if (previous) utils.savedMessages.list.setInfiniteData(listInput, previous);
      throw error;
    }
  };
  const deleteMessage = async (messageId: string) => {
    await utils.savedMessages.list.cancel(listInput);
    const previous = utils.savedMessages.list.getInfiniteData(listInput);
    utils.savedMessages.list.setInfiniteData(listInput, (current) => current ? {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        items: page.items.filter((item) => item.id !== messageId),
      })),
    } : current);
    try {
      const result = await remove.mutateAsync({ messageId });
      void refresh();
      return result;
    } catch (error) {
      if (previous) utils.savedMessages.list.setInfiniteData(listInput, previous);
      throw error;
    }
  };

  return (
    <SavedMessagesView
      ownerId={me.data?.id ?? ""}
      messages={messages.data?.pages.flatMap((page) => page.items) ?? []}
      loading={me.isLoading || availability.isLoading || messages.isLoading}
      error={messages.error?.message ?? availability.error?.message ?? me.error?.message}
      online={online}
      query={query}
      hasNextPage={Boolean(messages.hasNextPage)}
      loadingMore={messages.isFetchingNextPage}
      onQueryChange={setQuery}
      onRetry={() => Promise.all([
        me.refetch(),
        availability.refetch(),
        messages.refetch(),
      ])}
      onLoadMore={() => messages.fetchNextPage()}
      onCreate={createMessage}
      onEdit={editMessage}
      onDelete={deleteMessage}
      onBack={onBack}
    />
  );
}
