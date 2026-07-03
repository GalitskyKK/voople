"use client";

import { useCallback, useState } from "react";

import { useProfileCanvasStrokes } from "@/hooks/useProfileCanvasStrokes";
import type { ProfileViewModel } from "@/types/domain";
import type { Stroke } from "@/types/canvas";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { FlipCard } from "./FlipCard";
import { ProfileCanvas } from "./ProfileCanvas";
import { ProfileCanvasPreview } from "./ProfileCanvasPreview";

type ProfileFlipCardProps = {
  profile: ProfileViewModel;
  isOwner?: boolean;
  canFollow?: boolean;
  viewerId?: string | null;
  initialStrokes?: Stroke[];
  className?: string;
};

export function ProfileFlipCard({
  profile,
  isOwner = false,
  canFollow = false,
  viewerId = null,
  initialStrokes = [],
  className,
}: ProfileFlipCardProps) {
  const [flipped, setFlipped] = useState(false);

  const {
    strokes,
    appendStroke,
    removeStroke,
    persistStroke,
    clearAll,
    undoLastOwnStroke,
    refetchStrokes,
    canUndo,
    saveStatus,
  } = useProfileCanvasStrokes({
    profileUserId: profile.id,
    viewerId,
    initialStrokes,
  });

  const handleSyncFromServer = useCallback(() => {
    void refetchStrokes();
  }, [refetchStrokes]);

  const backShellClassName =
    "voople-profile-canvas-back h-full overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]";

  return (
    <FlipCard
      className={className}
      flipped={flipped}
      onFlippedChange={setFlipped}
      front={
        <ProfileCard
          profile={profile}
          isOwner={isOwner}
          canFollow={canFollow}
          className="h-full"
        />
      }
      renderBack={(isEditing) =>
        isEditing ? (
          <div className={backShellClassName}>
            <ProfileCanvas
              profileUserId={profile.id}
              profileOwnerId={profile.id}
              viewerId={viewerId}
              strokes={strokes}
              saveStatus={saveStatus}
              onPersistStroke={persistStroke}
              onAppendStroke={appendStroke}
              onRemoveStroke={removeStroke}
              onClearAll={clearAll}
              onUndoLastOwn={undoLastOwnStroke}
              onSyncFromServer={handleSyncFromServer}
              canClear={isOwner}
              canUndo={canUndo}
              className="h-full min-h-[320px]"
            />
          </div>
        ) : (
          <div className={backShellClassName}>
            <ProfileCanvasPreview strokes={strokes} className="h-full min-h-[320px]" />
          </div>
        )
      }
    />
  );
}
