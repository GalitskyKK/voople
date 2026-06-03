"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import { usePlaylistUiStore } from "@/stores/playlist-ui.store";
import type { ProfileStatus } from "@/types/domain";
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
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utils = trpc.useUtils();
  const openPlaylist = usePlaylistUiStore((s) => s.openPlaylist);

  const { data: liveProfile } = trpc.profile.getByUsername.useQuery(
    { username },
    { enabled: isOwner, staleTime: 5_000 },
  );

  useEffect(() => {
    if (!isOwner || !liveProfile?.status) return;
    const server = liveProfile.status;
    setDraft((prev) => {
      if (
        prev.trackId === server.trackId &&
        prev.trackTitle === server.trackTitle &&
        prev.trackArtist === server.trackArtist
      ) {
        return prev;
      }
      return {
        ...prev,
        trackId: server.trackId,
        trackTitle: server.trackTitle,
        trackArtist: server.trackArtist,
      };
    });
  }, [
    isOwner,
    liveProfile?.status?.trackId,
    liveProfile?.status?.trackTitle,
    liveProfile?.status?.trackArtist,
  ]);

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

  const statusForDisplay = useMemo(
    () => (isOwner ? draft : initialStatus),
    [draft, initialStatus, isOwner],
  );

  const busy = saveMutation.isPending || publishMutation.isPending;

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
    </div>
  );
}
