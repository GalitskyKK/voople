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
  // The native publisher is a separate LiveKit participant. Its owner opts in
  // to the preview explicitly and must never receive the mirrored audio.
  return source === Track.Source.ScreenShare && watching;
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
  setLocalAvailable,
  setWatching,
}: {
  roomRef: RefObject<Room | null>;
  clearRemoteScreen: () => void;
  setAvailable: (owner: string | null) => void;
  setLocalSharing: (sharing: boolean) => void;
  setLocalAvailable: (available: boolean) => void;
  setWatching: (watching: boolean) => void;
}) {
  // Screen video and screen audio are published separately. The audio
  // publication can arrive after the viewer has already pressed "Смотреть".
  // Remember the viewer's intent so late publications inherit the same
  // subscription state instead of being silently disabled.
  const watchingRef = useRef(false);
  // The native publisher is a separate participant. Bind its UI ownership to
  // the exact worker UUID so a late publication from a stopped worker cannot
  // revive a newer screen-share state.
  const expectedLocalSessionRef = useRef<string | null>(null);
  const activeScreenPublicationRef = useRef<string | null>(null);
  const activeScreenIsLocalRef = useRef(false);

  const syncPublication = useCallback((publication: RemoteTrackPublication, participant: RemoteParticipant) => {
    if (isRemoteScreenPublication(publication)) {
      const viewerId = roomRef.current?.localParticipant.identity;
      const ownerId = participant.attributes["voople.ownerId"];
      const ownNativeShare = Boolean(ownerId && viewerId && ownerId === viewerId);
      const screenSessionId = participant.attributes["voople.screenSessionId"];
      if (
        ownNativeShare &&
        (!screenSessionId || screenSessionId !== expectedLocalSessionRef.current)
      ) {
        publication.setSubscribed(false);
        return;
      }
      if (publication.source === Track.Source.ScreenShare) {
        activeScreenPublicationRef.current = publication.trackSid;
        activeScreenIsLocalRef.current = ownNativeShare;
        requestBestAvailableScreenVideo(publication);
        setAvailable(ownNativeShare ? "Ваш экран" : participant.name || participant.identity || "Участник");
        if (ownNativeShare) {
          setLocalAvailable(true);
          setLocalSharing(true);
        }
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
  }, [roomRef, setAvailable, setLocalAvailable, setLocalSharing]);

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
          const ownerId = participant.attributes["voople.ownerId"];
          const viewerId = roomRef.current?.localParticipant.identity;
          const ownNativeShare = Boolean(ownerId && viewerId && ownerId === viewerId);
          const matchesExpectedSession = !ownNativeShare || (
            participant.attributes["voople.screenSessionId"] === expectedLocalSessionRef.current
          );
          remotePublication.setSubscribed(shouldSubscribeToScreenPublication({
            source: remotePublication.source,
            ownerId,
            viewerId,
            watching: subscribed && matchesExpectedSession,
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
    if (publication.trackSid !== activeScreenPublicationRef.current) return;
    const viewerId = roomRef.current?.localParticipant.identity;
    const ownerId = participant.attributes["voople.ownerId"];
    const ownNativeShare = Boolean(ownerId && viewerId && ownerId === viewerId);
    const screenSessionId = participant.attributes["voople.screenSessionId"];
    if (ownNativeShare && screenSessionId !== expectedLocalSessionRef.current) {
      // A stopped worker may unpublish after a replacement has already joined.
      // Its late event must not clear the replacement's screen-share state.
      return;
    }
    if (ownNativeShare) {
      expectedLocalSessionRef.current = null;
      setLocalAvailable(false);
      setLocalSharing(false);
    }
    activeScreenPublicationRef.current = null;
    activeScreenIsLocalRef.current = false;
    watchingRef.current = false;
    setAvailable(null);
    setWatching(false);
    clearRemoteScreen();
  }, [clearRemoteScreen, roomRef, setAvailable, setLocalAvailable, setLocalSharing, setWatching]);

  const clearLocalShare = useCallback(() => {
    expectedLocalSessionRef.current = null;
    setLocalAvailable(false);
    setLocalSharing(false);
    if (!activeScreenIsLocalRef.current) return;
    activeScreenPublicationRef.current = null;
    activeScreenIsLocalRef.current = false;
    watchingRef.current = false;
    setAvailable(null);
    setWatching(false);
    clearRemoteScreen();
  }, [clearRemoteScreen, setAvailable, setLocalAvailable, setLocalSharing, setWatching]);

  const setExpectedLocalSessionId = useCallback((screenSessionId: string | null) => {
    expectedLocalSessionRef.current = screenSessionId;
  }, []);

  return {
    clearLocalShare,
    setExpectedLocalSessionId,
    removePublication,
    stopWatching: () => setScreenSubscribed(false),
    syncExisting,
    syncPublication,
    watch: () => setScreenSubscribed(true),
  };
}
