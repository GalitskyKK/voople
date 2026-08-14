"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import type { PostMediaUploadsController } from "@/hooks/usePostMediaUploads";

export function useCloudPostDraft({
  text,
  setText,
  uploads,
  enabled = true,
}: {
  text: string;
  setText: (value: string) => void;
  uploads: PostMediaUploadsController;
  enabled?: boolean;
}) {
  const utils = trpc.useUtils();
  const { data: subscription } = trpc.shop.subscriptionStatus.useQuery(undefined, { enabled });
  const { data: draft } = trpc.post.draft.useQuery(undefined, { enabled: enabled && Boolean(subscription?.active), staleTime: 30_000 });
  const save = trpc.post.saveDraft.useMutation();
  const remove = trpc.post.deleteDraft.useMutation();
  const [revision, setRevision] = useState(0);
  const [restored, setRestored] = useState(false);
  const applying = useRef(false);
  const lastSavedSignature = useRef("");
  const { media, restore } = uploads;

  useEffect(() => {
    if (!subscription?.active || restored || draft === undefined) return;
    applying.current = true;
    queueMicrotask(() => {
      if (draft) {
        setText(draft.text);
        restore(draft.media);
        setRevision(draft.revision);
        lastSavedSignature.current = JSON.stringify({ text: draft.text, media: draft.media.map(({ url: _url, ...item }) => item) });
      }
      setRestored(true);
      applying.current = false;
    });
  }, [draft, restore, restored, setText, subscription?.active]);

  const signature = JSON.stringify({ text, media });
  useEffect(() => {
    if (!subscription?.active || !restored || applying.current || save.isPending) return;
    if (!text.trim() && media.length === 0) return;
    if (signature === lastSavedSignature.current) return;
    const timer = window.setTimeout(() => {
      save.mutate({ text, media, expectedRevision: revision }, {
        onSuccess: (saved) => {
          setRevision(saved.revision);
          lastSavedSignature.current = signature;
          utils.post.draft.setData(undefined, saved);
        },
        onError: () => void utils.post.draft.invalidate(),
      });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [media, restored, revision, save, signature, subscription?.active, text, utils.post.draft]);

  const clear = useCallback(async () => {
    setRevision(0);
    lastSavedSignature.current = "";
    utils.post.draft.setData(undefined, null);
    if (subscription?.active) await remove.mutateAsync().catch(() => undefined);
  }, [remove, subscription?.active, utils.post.draft]);

  return {
    active: Boolean(subscription?.active),
    saving: save.isPending,
    error: save.error?.message ?? null,
    clear,
  };
}
