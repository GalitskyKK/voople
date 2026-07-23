"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import { usePlaylistUiStore } from "@/stores/playlist-ui.store";
import type { ProfileStatus } from "@/types/domain";
import type { UploadedMedia } from "@/hooks/useMediaUpload";
import { MediaUploadControl } from "@/components/media/MediaUploadControl";
import { PostComposer } from "@/components/feed/PostComposer";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { ProfileStatusBlock } from "./ProfileStatusBlock";
import { PublishStatusBanner } from "./PublishStatusBanner";

function statusEquals(a: ProfileStatus, b: ProfileStatus): boolean {
  return (
    a.moodValue === b.moodValue &&
    (a.thought ?? "") === (b.thought ?? "") &&
    (a.trackId ?? "") === (b.trackId ?? "") &&
    (a.trackTitle ?? "") === (b.trackTitle ?? "") &&
    (a.trackArtist ?? "") === (b.trackArtist ?? "")
  );
}

type ProfileStatusSectionProps = {
  username: string;
  initialStatus: ProfileStatus;
  isOwner?: boolean;
};

export function ProfileStatusSection({
  username,
  initialStatus,
  isOwner = false,
}: ProfileStatusSectionProps) {
  const [feedPublished, setFeedPublished] = useState<ProfileStatus>(initialStatus);
  const [draft, setDraft] = useState<ProfileStatus>(initialStatus);
  const [composerOpen, setComposerOpen] = useState(false);
  const [postText, setPostText] = useState("");
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [uploadResetKey, setUploadResetKey] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utils = trpc.useUtils();
  const openPlaylist = usePlaylistUiStore((s) => s.openPlaylist);

  const { data: liveProfile } = trpc.profile.getByUsername.useQuery(
    { username },
    { enabled: isOwner, staleTime: 5_000 },
  );

  // Подтягиваем серверный трек статуса в черновик при его изменении — во время
  // рендера (без эффекта): сравниваем ключ серверных значений с предыдущим.
  const server = isOwner ? liveProfile?.status : undefined;
  const serverTrackKey = server
    ? `${server.trackId ?? ""}|${server.trackTitle ?? ""}|${server.trackArtist ?? ""}`
    : null;
  const [prevServerTrackKey, setPrevServerTrackKey] = useState<string | null>(null);
  if (server && serverTrackKey !== prevServerTrackKey) {
    setPrevServerTrackKey(serverTrackKey);
    setDraft((prev) =>
      prev.trackId === server.trackId &&
      prev.trackTitle === server.trackTitle &&
      prev.trackArtist === server.trackArtist
        ? prev
        : {
            ...prev,
            trackId: server.trackId,
            trackTitle: server.trackTitle,
            trackArtist: server.trackArtist,
          },
    );
  }

  const dirty = isOwner && !statusEquals(draft, feedPublished);

  const saveMutation = trpc.status.save.useMutation({
    onSuccess: () => {
      utils.profile.getByUsername.setData({ username }, (profile) =>
        profile ? { ...profile, status: draft } : profile,
      );
    },
  });

  const publishMutation = trpc.status.publishToFeed.useMutation({
    onSuccess: (post) => {
      setFeedPublished(draft);
      setPostText("");
      setMedia(null);
      setUploadResetKey((key) => key + 1);
      setComposerOpen(false);
      utils.profile.getPostsByUsername.setData({ username }, (prev) =>
        prev ? [post, ...prev] : [post],
      );
      void utils.feed.getPage.invalidate();
    },
  });

  const updateDraft = useCallback((patch: Partial<ProfileStatus>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const saveMutate = saveMutation.mutate;
  const skipFirstSave = useRef(true);

  useEffect(() => {
    if (!isOwner) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveMutate({
        moodValue: draft.moodValue ?? null,
        thought: draft.thought ?? null,
        trackId: draft.trackId ?? null,
        trackTitle: draft.trackTitle ?? null,
        trackArtist: draft.trackArtist ?? null,
      });
    }, 700);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, isOwner, saveMutate]);

  const handlePublish = useCallback(() => {
    publishMutation.mutate({
      moodValue: draft.moodValue ?? null,
      thought: draft.thought ?? null,
      trackId: draft.trackId ?? null,
      trackTitle: draft.trackTitle ?? null,
      trackArtist: draft.trackArtist ?? null,
    });
  }, [draft, publishMutation]);

  const handleExpandedPublish = useCallback(() => {
    publishMutation.mutate({
      moodValue: draft.moodValue ?? null,
      thought: draft.thought ?? null,
      trackId: draft.trackId ?? null,
      trackTitle: draft.trackTitle ?? null,
      trackArtist: draft.trackArtist ?? null,
      text: postText.trim() || undefined,
      mediaKey: media?.mediaKey,
      mediaType: media?.mediaType,
    });
  }, [draft, media, postText, publishMutation]);

  const statusForDisplay = useMemo(
    () => (isOwner ? draft : initialStatus),
    [draft, initialStatus, isOwner],
  );

  const busy = publishMutation.isPending;

  const handleMusicClick = useCallback(() => {
    openPlaylist(username, draft.trackId ?? liveProfile?.status?.trackId ?? null);
  }, [draft.trackId, liveProfile?.status?.trackId, openPlaylist, username]);

  return (
    <div className="voople-profile-status relative">
      <ProfileStatusBlock
        status={statusForDisplay}
        editable={isOwner && !busy}
        showEmptyFields={isOwner}
        showMusicForOwner={isOwner}
        onMoodChange={(moodValue) => updateDraft({ moodValue })}
        onThoughtChange={(thought) => updateDraft({ thought })}
        onMusicClick={handleMusicClick}
        onExpand={isOwner ? () => setComposerOpen(true) : undefined}
      />
      {isOwner && (
        <PublishStatusBanner
          visible={dirty}
          onPublish={handlePublish}
          disabled={publishMutation.isPending}
        />
      )}
      {publishMutation.error && (
        <p className="text-xs text-red-400">{publishMutation.error.message}</p>
      )}
      {isOwner && (
        <Sheet open={composerOpen} onClose={() => setComposerOpen(false)} className="max-w-xl">
          <div className="pe-10">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--theme-accent)]">
              Mood Post
            </p>
            <h2 className="mt-1 text-xl font-semibold">Сохранить этот момент</h2>
            <p className="mt-1 text-sm text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">
              Состояние уже взято из карточки. Добавьте контекст или медиа — только если хочется.
            </p>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-[color-mix(in_srgb,var(--foreground)_48%,transparent)]">
              Сам муд
            </p>
            <ProfileStatusBlock
              status={draft}
              editable={!publishMutation.isPending}
              showEmptyFields
              showMusicForOwner
              onMoodChange={(moodValue) => updateDraft({ moodValue })}
              onThoughtChange={(thought) => updateDraft({ thought })}
              onMusicClick={handleMusicClick}
            />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-[color-mix(in_srgb,var(--foreground)_48%,transparent)]">
              Если хочется рассказать больше
            </p>
            <PostComposer
              value={postText}
              onChange={setPostText}
              disabled={publishMutation.isPending}
              placeholder="Что стоит запомнить об этом моменте?"
            />
            <MediaUploadControl
              key={uploadResetKey}
              purpose="post"
              onChange={setMedia}
              disabled={publishMutation.isPending}
              allowVideo
              showCircleOption
              className="mt-2"
            />
          </div>

          <Button
            type="button"
            variant="primary"
            className="mt-4 w-full"
            disabled={publishMutation.isPending}
            onClick={handleExpandedPublish}
          >
            {publishMutation.isPending ? "Публикуем…" : "Опубликовать муд"}
          </Button>
        </Sheet>
      )}
    </div>
  );
}
