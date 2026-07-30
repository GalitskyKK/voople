"use client";

import { useCallback, useRef, useState } from "react";
import {
  Track,
  type LocalTrackPublication,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client";

export function useVoiceVideoStage() {
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenShareOwner, setScreenShareOwner] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraCount, setCameraCount] = useState(0);
  const screenContainerRef = useRef<HTMLDivElement | null>(null);
  const screenParkingRef = useRef<HTMLDivElement | null>(null);
  const cameraContainerRef = useRef<HTMLDivElement | null>(null);
  const cameraParkingRef = useRef<HTMLDivElement | null>(null);

  const updateCameraCount = useCallback(() => {
    setCameraCount(
      (cameraContainerRef.current?.childElementCount ?? 0) +
        (cameraParkingRef.current?.childElementCount ?? 0),
    );
  }, []);

  const clearScreen = useCallback(() => {
    screenContainerRef.current?.replaceChildren();
    screenParkingRef.current?.replaceChildren();
  }, []);

  const removeCamera = useCallback(
    (trackId: string) => {
      for (const container of [cameraContainerRef.current, cameraParkingRef.current]) {
        const tile = [...(container?.children ?? [])].find(
          (element) =>
            element instanceof HTMLElement && element.dataset.livekitCamera === trackId,
        );
        tile?.remove();
      }
      updateCameraCount();
    },
    [updateCameraCount],
  );

  const attachCamera = useCallback(
    (
      element: HTMLVideoElement,
      trackId: string,
      participantName: string,
      isLocal = false,
    ) => {
      removeCamera(trackId);
      const container = cameraContainerRef.current ?? cameraParkingRef.current;
      if (!container) return;

      element.autoplay = true;
      element.playsInline = true;
      element.className = "aspect-video h-full w-full object-cover";

      const tile = document.createElement("div");
      tile.dataset.livekitCamera = trackId;
      if (isLocal || element.muted) tile.dataset.livekitLocalCamera = "true";
      tile.className =
        "relative overflow-hidden rounded-2xl border border-[var(--app-border)] bg-black";

      const label = document.createElement("span");
      label.className =
        "absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[11px] text-white";
      label.textContent = participantName;
      tile.append(element, label);
      container.appendChild(tile);
      updateCameraCount();
    },
    [removeCamera, updateCameraCount],
  );

  const attachRemoteVideo = useCallback(
    (
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (track.kind !== Track.Kind.Video) return;

      if (publication.source === Track.Source.ScreenShare) {
        clearScreen();
        const target = screenContainerRef.current ?? screenParkingRef.current;
        const element = track.attach() as HTMLVideoElement;
        element.autoplay = true;
        element.playsInline = true;
        element.className = "h-full w-full object-contain";
        target?.appendChild(element);
        setScreenShareOwner(participant.name || "Участник");
      } else if (publication.source === Track.Source.Camera) {
        attachCamera(
          track.attach() as HTMLVideoElement,
          publication.trackSid,
          participant.name || participant.identity || "Участник",
        );
      }
    },
    [attachCamera, clearScreen],
  );

  const attachLocalVideo = useCallback(
    (publication: LocalTrackPublication) => {
      if (!publication.track) return;
      if (publication.source === Track.Source.ScreenShare) {
        clearScreen();
        const target = screenContainerRef.current ?? screenParkingRef.current;
        const element = publication.track.attach() as HTMLVideoElement;
        element.autoplay = true;
        element.muted = true;
        element.playsInline = true;
        element.className = "h-full w-full object-contain";
        target?.appendChild(element);
        setScreenSharing(true);
        setScreenShareOwner("Ваш экран");
      } else if (publication.source === Track.Source.Camera) {
        const element = publication.track.attach() as HTMLVideoElement;
        element.muted = true;
        attachCamera(element, publication.trackSid, "Вы", true);
        setCameraEnabled(true);
      }
    },
    [attachCamera, clearScreen],
  );

  const detachRemoteVideo = useCallback(
    (track: RemoteTrack, publication: RemoteTrackPublication) => {
      track.detach().forEach((element) => element.remove());
      if (track.source === Track.Source.ScreenShare) {
        clearScreen();
        setScreenShareOwner(null);
      } else if (track.source === Track.Source.Camera) {
        removeCamera(publication.trackSid);
      }
    },
    [clearScreen, removeCamera],
  );

  const detachLocalVideo = useCallback(
    (publication: LocalTrackPublication) => {
      if (
        publication.source !== Track.Source.ScreenShare &&
        publication.source !== Track.Source.Camera
      ) {
        return;
      }
      publication.track?.detach().forEach((element) => element.remove());
      if (publication.source === Track.Source.ScreenShare) {
        clearScreen();
        setScreenSharing(false);
        setScreenShareOwner(null);
      } else {
        removeCamera(publication.trackSid);
        setCameraEnabled(false);
      }
    },
    [clearScreen, removeCamera],
  );

  const showParkedMedia = useCallback(() => {
    const screenTarget = screenContainerRef.current;
    const parkedScreen = screenParkingRef.current;
    if (screenTarget && parkedScreen?.childNodes.length) {
      screenTarget.replaceChildren(...parkedScreen.childNodes);
    }
    const cameraTarget = cameraContainerRef.current;
    const parkedCameras = cameraParkingRef.current;
    if (cameraTarget && parkedCameras?.childNodes.length) {
      cameraTarget.replaceChildren(...parkedCameras.childNodes);
    }
  }, []);

  const parkVisibleMedia = useCallback(() => {
    const screenSource = screenContainerRef.current;
    if (screenSource?.childNodes.length && screenParkingRef.current) {
      screenParkingRef.current.replaceChildren(...screenSource.childNodes);
    }
    const cameraSource = cameraContainerRef.current;
    if (cameraSource?.childNodes.length && cameraParkingRef.current) {
      cameraParkingRef.current.replaceChildren(...cameraSource.childNodes);
    }
  }, []);

  const clearVideoMedia = useCallback(() => {
    clearScreen();
    cameraContainerRef.current?.replaceChildren();
    cameraParkingRef.current?.replaceChildren();
    setScreenSharing(false);
    setScreenShareOwner(null);
    setCameraEnabled(false);
    setCameraCount(0);
  }, [clearScreen]);

  const clearLocalCamera = useCallback(() => {
    for (const container of [cameraContainerRef.current, cameraParkingRef.current]) {
      container
        ?.querySelectorAll<HTMLElement>("[data-livekit-local-camera]")
        .forEach((tile) => tile.remove());
    }
    setCameraEnabled(false);
    updateCameraCount();
  }, [updateCameraCount]);

  return {
    screenContainerRef,
    screenParkingRef,
    cameraContainerRef,
    cameraParkingRef,
    screenSharing,
    setScreenSharing,
    screenShareOwner,
    cameraEnabled,
    setCameraEnabled,
    cameraCount,
    attachRemoteVideo,
    attachLocalVideo,
    detachRemoteVideo,
    detachLocalVideo,
    clearLocalCamera,
    showParkedMedia,
    parkVisibleMedia,
    clearVideoMedia,
  };
}
