import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PostViewModel, ProfileViewModel } from "@/types/domain";
import type { Stroke } from "@/types/canvas";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

type DesktopProfileData = {
  profile: ProfileViewModel;
  posts: PostViewModel[];
  pinnedPost: PostViewModel | null;
  canvasStrokes: Stroke[];
  isOwner: boolean;
};

function parseUsername(value: unknown): string {
  if (!value || typeof value !== "object") {
    throw new Error("Не удалось определить профиль");
  }
  const username = (value as { username?: unknown }).username;
  if (typeof username !== "string" || username.length === 0) {
    throw new Error("Сервер вернул некорректное имя профиля");
  }
  return username;
}

function parseProfile(value: unknown): ProfileViewModel {
  if (!value || typeof value !== "object") {
    throw new Error("Сервер вернул пустой профиль");
  }
  const profile = value as Partial<ProfileViewModel>;
  if (
    typeof profile.id !== "string" ||
    typeof profile.username !== "string" ||
    typeof profile.displayName !== "string" ||
    !profile.customization ||
    !profile.status ||
    !profile.stats
  ) {
    throw new Error("Сервер вернул некорректный профиль");
  }
  return profile as ProfileViewModel;
}

function parsePosts(value: unknown): PostViewModel[] {
  if (!Array.isArray(value)) {
    throw new Error("Сервер вернул некорректную ленту профиля");
  }
  return value as PostViewModel[];
}

function parseCanvasStrokes(value: unknown): Stroke[] {
  if (!Array.isArray(value)) {
    throw new Error("Сервер вернул некорректный холст профиля");
  }
  return value as Stroke[];
}

export function useDesktopProfile(
  config: DesktopConfig,
  session: Session,
  requestedUsername: string | null,
) {
  const [data, setData] = useState<DesktopProfileData>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadVersion, setReloadVersion] = useState(0);
  const requestId = useRef(0);
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );

  useEffect(() => {
    const currentRequest = ++requestId.current;
    void Promise.resolve().then(async () => {
      if (currentRequest !== requestId.current) return;
      setLoading(true);
      setError(null);

      try {
        const viewer = await client.query("user.me");
        const viewerUsername = parseUsername(viewer);
        const username = requestedUsername ?? viewerUsername;
        const profileValue = await client.query("profile.getByUsername", {
          username,
        });
        const profile = parseProfile(profileValue);
        const [postsValue, pinnedPostValue, strokesValue] = await Promise.all([
          client.query("profile.getPostsByUsername", { username }),
          client.query("profile.getPinnedPostByUsername", { username }),
          client.query("profileCanvas.listStrokes", {
            profileUserId: profile.id,
          }),
        ]);
        if (currentRequest !== requestId.current) return;
        setData({
          profile,
          posts: parsePosts(postsValue),
          pinnedPost:
            pinnedPostValue === null
              ? null
              : (parsePosts([pinnedPostValue])[0] ?? null),
          canvasStrokes: parseCanvasStrokes(strokesValue),
          isOwner: profile.username === viewerUsername,
        });
      } catch (loadError: unknown) {
        if (currentRequest !== requestId.current) return;
        setData(undefined);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Не удалось загрузить профиль",
        );
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    });

    return () => {
      requestId.current += 1;
    };
  }, [client, reloadVersion, requestedUsername]);

  const reload = useCallback(() => {
    setReloadVersion((version) => version + 1);
  }, []);

  return { data, error, loading, reload };
}
