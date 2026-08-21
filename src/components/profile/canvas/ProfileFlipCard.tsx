"use client";

import { useCallback, useState, type ReactNode } from "react";

import { useProfileCanvasStrokes } from "@/hooks/useProfileCanvasStrokes";
import type { ProfileViewModel } from "@/types/domain";
import type { Stroke } from "@/types/canvas";
import { FlipCard } from "./FlipCard";
import { ProfileCanvas } from "./ProfileCanvas";
import { ProfileCanvasPreview } from "./ProfileCanvasPreview";

type ProfileFlipCardProps = {
  profile: ProfileViewModel;
  isOwner?: boolean;
  viewerId?: string | null;
  initialStrokes?: Stroke[];
  front: ReactNode;
  realtimeEnabled?: boolean;
  className?: string;
};

export function ProfileFlipCard({
  profile,
  isOwner = false,
  viewerId = null,
  initialStrokes = [],
  front,
  realtimeEnabled = true,
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
      front={front}
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
              realtimeEnabled={realtimeEnabled}
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
