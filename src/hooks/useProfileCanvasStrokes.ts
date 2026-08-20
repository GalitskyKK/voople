"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { findLastOwnStroke } from "@/lib/canvas/strokes";
import { trpc } from "@/lib/trpc/client";
import type { Stroke } from "@/types/canvas";

export type CanvasSaveStatus = "idle" | "saving" | "saved" | "error";

type UseProfileCanvasStrokesOptions = {
  profileUserId: string;
  viewerId: string | null | undefined;
  initialStrokes: Stroke[];
};

const SAVED_INDICATOR_MS = 2_500;

export function useProfileCanvasStrokes({
  profileUserId,
  viewerId,
  initialStrokes,
}: UseProfileCanvasStrokesOptions) {
  const utils = trpc.useUtils();
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("idle");

  const listQuery = trpc.profileCanvas.listStrokes.useQuery(
    { profileUserId },
    {
      initialData: initialStrokes,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  );

  const strokes = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  useEffect(() => {
    if (saveStatus !== "saved") return;
    const timer = setTimeout(() => setSaveStatus("idle"), SAVED_INDICATOR_MS);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  const appendStroke = useCallback(
    (stroke: Stroke) => {
      utils.profileCanvas.listStrokes.setData({ profileUserId }, (current) => {
        if (!current) return [stroke];
        if (current.some((item) => item.id === stroke.id)) return current;
        return [...current, stroke];
      });
    },
    [profileUserId, utils.profileCanvas.listStrokes],
  );

  const removeStroke = useCallback(
    (strokeId: string) => {
      utils.profileCanvas.listStrokes.setData({ profileUserId }, (current) => {
        if (!current) return current;
        return current.filter((item) => item.id !== strokeId);
      });
    },
    [profileUserId, utils.profileCanvas.listStrokes],
  );

  const replaceStrokes = useCallback(
    (next: Stroke[]) => {
      utils.profileCanvas.listStrokes.setData({ profileUserId }, next);
    },
    [profileUserId, utils.profileCanvas.listStrokes],
  );

  const refetchStrokes = useCallback(async () => {
    const fresh = await utils.profileCanvas.listStrokes.fetch({ profileUserId });
    replaceStrokes(fresh);
    return fresh;
  }, [profileUserId, replaceStrokes, utils.profileCanvas.listStrokes]);

  const saveStrokeMutation = trpc.profileCanvas.saveStroke.useMutation({
    onMutate: () => setSaveStatus("saving"),
    onSuccess: () => setSaveStatus("saved"),
    onError: () => {
      setSaveStatus("error");
      void listQuery.refetch();
    },
  });

  const clearMutation = trpc.profileCanvas.clear.useMutation({
    onSuccess: () => {
      replaceStrokes([]);
      setSaveStatus("saved");
    },
    onError: () => {
      setSaveStatus("error");
      void listQuery.refetch();
    },
  });

  const undoMutation = trpc.profileCanvas.undoLastStroke.useMutation({
    onSuccess: () => setSaveStatus("saved"),
    onError: () => {
      setSaveStatus("error");
      void listQuery.refetch();
    },
  });

  const persistStroke = useCallback(
    (stroke: Stroke) => {
      appendStroke(stroke);
      saveStrokeMutation.mutate({ profileUserId, stroke });
    },
    [appendStroke, profileUserId, saveStrokeMutation],
  );

  const clearAll = useCallback(() => {
    replaceStrokes([]);
    clearMutation.mutate({ profileUserId });
  }, [clearMutation, profileUserId, replaceStrokes]);

  const undoLastOwnStroke = useCallback((): Stroke | null => {
    const lastOwn = findLastOwnStroke(strokes, viewerId);
    if (!lastOwn || undoMutation.isPending) return null;

    removeStroke(lastOwn.id);
    undoMutation.mutate({ profileUserId });
    return lastOwn;
  }, [profileUserId, removeStroke, strokes, undoMutation, viewerId]);

  const lastOwnStroke = findLastOwnStroke(strokes, viewerId);
  const canUndo = Boolean(viewerId && lastOwnStroke && !undoMutation.isPending);

  return {
    strokes,
    appendStroke,
    removeStroke,
    replaceStrokes,
    refetchStrokes,
    persistStroke,
    clearAll,
    undoLastOwnStroke,
    canUndo,
    saveStatus,
    isSaving: saveStrokeMutation.isPending,
    isClearing: clearMutation.isPending,
  };
}
