import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CommentViewModel, PostViewModel } from "@/types/domain";
import { createDesktopTrpcClient } from "../api/trpc";
import { getSupabase } from "../auth/supabase";
import type { DesktopConfig } from "../config";

function parsePost(value: unknown): PostViewModel {
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as Partial<PostViewModel>).id !== "string"
  ) {
    throw new Error("Сервер вернул некорректный пост");
  }
  return value as PostViewModel;
}

function parseComment(value: unknown): CommentViewModel {
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as Partial<CommentViewModel>).id !== "string"
  ) {
    throw new Error("Сервер вернул некорректный комментарий");
  }
  return value as CommentViewModel;
}

function parseComments(value: unknown): CommentViewModel[] {
  if (!Array.isArray(value)) {
    throw new Error("Сервер вернул некорректные комментарии");
  }
  return value.map(parseComment);
}

export function useDesktopPostDetail(
  config: DesktopConfig,
  session: Session,
  postId: string,
) {
  const [post, setPost] = useState<PostViewModel>();
  const [comments, setComments] = useState<CommentViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );
  const requestId = useRef(0);
  const commentsRequestId = useRef(0);
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

  const loadComments = useCallback(
    async (showLoading = true) => {
      const currentRequest = ++commentsRequestId.current;
      if (showLoading) setCommentsLoading(true);
      try {
        const next = parseComments(
          await client.query("post.listComments", { postId }),
        );
        if (currentRequest === commentsRequestId.current) setComments(next);
      } catch (loadError) {
        if (currentRequest === commentsRequestId.current) {
          setMutationError(
            loadError instanceof Error
              ? loadError.message
              : "Не удалось загрузить комментарии",
          );
        }
      } finally {
        if (currentRequest === commentsRequestId.current) {
          setCommentsLoading(false);
        }
      }
    },
    [client, postId],
  );

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setCommentsLoading(true);
    setError(null);
    setMutationError(null);
    try {
      const [postValue, commentsValue] = await Promise.all([
        client.query("post.getById", { postId }),
        client.query("post.listComments", { postId }),
      ]);
      if (currentRequest !== requestId.current) return;
      setPost(parsePost(postValue));
      setComments(parseComments(commentsValue));
    } catch (loadError) {
      if (currentRequest !== requestId.current) return;
      setPost(undefined);
      setComments([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить публикацию",
      );
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setCommentsLoading(false);
      }
    }
  }, [client, postId]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    return () => {
      requestId.current += 1;
      commentsRequestId.current += 1;
    };
  }, [load]);

  useEffect(() => {
    const supabase = getSupabase(config);
    const channel = supabase
      .channel(`desktop-post-comments:${postId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          void loadComments(false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [config, loadComments, postId]);

  const createComment = useCallback(
    async (input: {
      text?: string;
      mediaKey?: string;
      mediaType?: "image" | "gif" | "meme" | "video" | "circle";
    }) => {
      if (creating) return false;
      setCreating(true);
      setMutationError(null);
      try {
        const created = parseComment(
          await client.mutation("post.createComment", { postId, ...input }),
        );
        setComments((current) =>
          current.some((comment) => comment.id === created.id)
            ? current
            : [...current, created],
        );
        setPost((current) =>
          current
            ? { ...current, replyCount: current.replyCount + 1 }
            : current,
        );
        return true;
      } catch (createError) {
        setMutationError(
          createError instanceof Error
            ? createError.message
            : "Не удалось отправить комментарий",
        );
        return false;
      } finally {
        setCreating(false);
      }
    },
    [client, creating, postId],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (deletingCommentId) return false;
      setDeletingCommentId(commentId);
      setMutationError(null);
      try {
        await client.mutation("post.deleteComment", { commentId });
        setComments((current) =>
          current.filter((comment) => comment.id !== commentId),
        );
        setPost((current) =>
          current
            ? {
                ...current,
                replyCount: Math.max(0, current.replyCount - 1),
              }
            : current,
        );
        return true;
      } catch (deleteError) {
        setMutationError(
          deleteError instanceof Error
            ? deleteError.message
            : "Не удалось удалить комментарий",
        );
        return false;
      } finally {
        setDeletingCommentId(null);
      }
    },
    [client, deletingCommentId],
  );

  return {
    comments,
    commentsLoading,
    createComment,
    creating,
    deleteComment,
    deletingCommentId,
    error,
    loading,
    mutationError,
    post,
    retry: load,
  };
}
