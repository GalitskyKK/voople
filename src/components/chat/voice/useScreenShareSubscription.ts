"use client";

import { useCallback, useRef, type RefObject } from "react";
import { Track, VideoQuality, type RemoteParticipant, type RemoteTrackPublication, type Room } from "livekit-client";

export function isRemoteScreenPublication(publication: RemoteTrackPublication) {
  return publication.source === Track.Source.ScreenShare || publication.source === Track.Source.ScreenShareAudio;
}

export function shouldSubscribeToScreenPublication({
  source,
  ownerId,
  viewerId,
  watching,
}: {
  source: Track.Source;
  ownerId: string | undefined;
  viewerId: string | undefined;
  watching: boolean;
}) {
  const ownNativeShare = Boolean(ownerId && viewerId && ownerId === viewerId);
  if (!ownNativeShare) return watching;
  // The native publisher is a separate LiveKit participant. Keep its video
  // subscribed for the local preview, but never play its audio back to owner.
  return source === Track.Source.ScreenShare;
}

function requestBestAvailableScreenVideo(publication: RemoteTrackPublication) {
  if (publication.source !== Track.Source.ScreenShare) return;
  // Standard senders cap at 30 FPS and Plus senders at 60 FPS. Requesting the
  // upper bound here lets LiveKit deliver the best layer the publisher actually
  // exposes while adaptive streaming can still unsubscribe hidden stages.
  publication.setVideoQuality(VideoQuality.HIGH);
  publication.setVideoFPS(60);
}

export function useScreenShareSubscription({
  roomRef,
  clearRemoteScreen,
  setAvailable,
  setLocalSharing,
  setWatching,
}: {
  roomRef: RefObject<Room | null>;
  clearRemoteScreen: () => void;
  setAvailable: (owner: string | null) => void;
  setLocalSharing: (sharing: boolean) => void;
  setWatching: (watching: boolean) => void;
}) {
  // Screen video and screen audio are published separately. The audio
  // publication can arrive after the viewer has already pressed "Смотреть".
  // Remember the viewer's intent so late publications inherit the same
  // subscription state instead of being silently disabled.
  const watchingRef = useRef(false);

  const syncPublication = useCallback((publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    if (isRemoteScreenPublication(publication)) {
      const viewerId = roomRef.current?.localParticipant.identity;
      const ownerId = participant.attributes["voople.ownerId"];
      const ownNativeShare = Boolean(ownerId && viewerId && ownerId === viewerId);
      if (publication.source === Track.Source.ScreenShare) {
        requestBestAvailableScreenVideo(publication);
        setAvailable(ownNativeShare ? "Ваш экран" : participant.name || participant.identity || "Участник");
        if (ownNativeShare) setLocalSharing(true);
      }
      publication.setSubscribed(shouldSubscribeToScreenPublication({
        source: publication.source,
        ownerId,
        viewerId,
        watching: watchingRef.current,
      }));
    } else {
      publication.setSubscribed(true);
    }
  }, [roomRef, setAvailable, setLocalSharing]);

  const syncExisting = useCallback((room: Room) => {
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => syncPublication(publication as RemoteTrackPublication, participant));
    });
  }, [syncPublication]);

  const setScreenSubscribed = useCallback((subscribed: boolean) => {
    watchingRef.current = subscribed;
    roomRef.current?.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        const remotePublication = publication as RemoteTrackPublication;
        if (isRemoteScreenPublication(remotePublication)) {
          requestBestAvailableScreenVideo(remotePublication);
          remotePublication.setSubscribed(shouldSubscribeToScreenPublication({
            source: remotePublication.source,
            ownerId: participant.attributes["voople.ownerId"],
            viewerId: roomRef.current?.localParticipant.identity,
            watching: subscribed,
          }));
        }
      });
    });
    setWatching(subscribed);
    if (!subscribed) clearRemoteScreen();
  }, [clearRemoteScreen, roomRef, setWatching]);

  const removePublication = useCallback((
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    if (publication.source !== Track.Source.ScreenShare) return;
    const viewerId = roomRef.current?.localParticipant.identity;
    const ownerId = participant.attributes["voople.ownerId"];
    if (ownerId && viewerId && ownerId === viewerId) setLocalSharing(false);
    watchingRef.current = false;
    setAvailable(null);
    setWatching(false);
    clearRemoteScreen();
  }, [clearRemoteScreen, roomRef, setAvailable, setLocalSharing, setWatching]);

  return {
    removePublication,
    stopWatching: () => setScreenSubscribed(false),
    syncExisting,
    syncPublication,
    watch: () => setScreenSubscribed(true),
  };
}
