"use client";

import { useCallback, useRef, type RefObject } from "react";
import { Track, type RemoteParticipant, type RemoteTrackPublication, type Room } from "livekit-client";

export function isRemoteScreenPublication(publication: RemoteTrackPublication) {
  return publication.source === Track.Source.ScreenShare || publication.source === Track.Source.ScreenShareAudio;
}

export function useScreenShareSubscription({
  roomRef,
  clearRemoteScreen,
  setAvailable,
  setWatching,
}: {
  roomRef: RefObject<Room | null>;
  clearRemoteScreen: () => void;
  setAvailable: (owner: string | null) => void;
  setWatching: (watching: boolean) => void;
}) {
  // Screen video and screen audio are published separately. The audio
  // publication can arrive after the viewer has already pressed "Смотреть".
  // Remember the viewer's intent so late publications inherit the same
  // subscription state instead of being silently disabled.
  const watchingRef = useRef(false);

  const syncPublication = useCallback((publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    if (isRemoteScreenPublication(publication)) {
      if (publication.source === Track.Source.ScreenShare) {
        setAvailable(participant.name || participant.identity || "Участник");
      }
      publication.setSubscribed(watchingRef.current);
    } else {
      publication.setSubscribed(true);
    }
  }, [setAvailable]);

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
        if (isRemoteScreenPublication(remotePublication)) remotePublication.setSubscribed(subscribed);
      });
    });
    setWatching(subscribed);
    if (!subscribed) clearRemoteScreen();
  }, [clearRemoteScreen, roomRef, setWatching]);

  const removePublication = useCallback((publication: RemoteTrackPublication) => {
    if (publication.source !== Track.Source.ScreenShare) return;
    watchingRef.current = false;
    setAvailable(null);
    setWatching(false);
    clearRemoteScreen();
  }, [clearRemoteScreen, setAvailable, setWatching]);

  return {
    removePublication,
    stopWatching: () => setScreenSubscribed(false),
    syncExisting,
    syncPublication,
    watch: () => setScreenSubscribed(true),
  };
}
