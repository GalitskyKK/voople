"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { trpc } from "@/lib/trpc/client";
import type { ProfileStatus } from "@/types/domain";
import { ProfileStatusBlock } from "./ProfileStatusBlock";
import { PublishStatusBanner } from "./PublishStatusBanner";

function statusEquals(a: ProfileStatus, b: ProfileStatus): boolean {
  return (
    a.moodValue === b.moodValue &&
    (a.thought ?? "") === (b.thought ?? "") &&
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
      trackTitle: draft.trackTitle ?? null,
      trackArtist: draft.trackArtist ?? null,
    });
  }, [draft, publishMutation]);

  const statusForDisplay = useMemo(
    () => (isOwner ? draft : initialStatus),
    [draft, initialStatus, isOwner],
  );

  const busy = saveMutation.isPending || publishMutation.isPending;

  return (
    <div className="voople-profile-status relative">
      <ProfileStatusBlock
        status={statusForDisplay}
        editable={isOwner && !busy}
        showEmptyFields={isOwner}
        onMoodChange={(moodValue) => updateDraft({ moodValue })}
        onThoughtChange={(thought) => updateDraft({ thought })}
        onTrackChange={(trackTitle, trackArtist) => updateDraft({ trackTitle, trackArtist })}
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
