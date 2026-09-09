"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { useBrowserOnline } from "@/hooks/useBrowserOnline";
import { trpc } from "@/lib/trpc/client";
import type { SavedMessageDraft } from "@/types/saved-messages";

import { SavedMessagesView } from "./SavedMessagesView";

export function SavedMessagesController({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const online = useBrowserOnline();
  const utils = trpc.useUtils();
  const me = trpc.user.me.useQuery(undefined, { staleTime: 60_000 });
  const availability = trpc.savedMessages.availability.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const enabled = availability.data?.enabled === true;
  const messages = trpc.savedMessages.list.useInfiniteQuery(
    { limit: 30, query: deferredQuery || undefined },
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
  const createMessage = async (draft: SavedMessageDraft) => {
    await create.mutateAsync(draft);
    await refresh();
  };
  const editMessage = async (messageId: string, text: string) => {
    await edit.mutateAsync({ messageId, text });
    await refresh();
  };
  const deleteMessage = async (messageId: string) => {
    await remove.mutateAsync({ messageId });
    await refresh();
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
