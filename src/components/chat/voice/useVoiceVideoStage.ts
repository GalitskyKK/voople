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
  const [cameraParticipantIds, setCameraParticipantIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const screenContainerRef = useRef<HTMLDivElement | null>(null);
  const screenParkingRef = useRef<HTMLDivElement | null>(null);
  const cameraParkingRef = useRef<HTMLDivElement | null>(null);
  const cameraHostsRef = useRef(new Map<string, HTMLDivElement>());

  const getCameraContainers = useCallback(() => {
    return [cameraParkingRef.current, ...cameraHostsRef.current.values()].filter(
      (container): container is HTMLDivElement => Boolean(container),
    );
  }, []);

  const syncCameraParticipantIds = useCallback(() => {
    const participantIds = new Set<string>();
    for (const container of getCameraContainers()) {
      for (const element of container.children) {
        if (
          element instanceof HTMLElement &&
          element.dataset.livekitParticipant
        ) {
          participantIds.add(element.dataset.livekitParticipant);
        }
      }
    }
    setCameraParticipantIds(participantIds);
  }, [getCameraContainers]);

  const clearScreen = useCallback(() => {
    screenContainerRef.current?.replaceChildren();
    screenParkingRef.current?.replaceChildren();
  }, []);

  const removeCamera = useCallback(
    (trackId: string) => {
      let participantId: string | undefined;
      for (const container of getCameraContainers()) {
        const tile = [...(container?.children ?? [])].find(
          (element) =>
            element instanceof HTMLElement && element.dataset.livekitCamera === trackId,
        );
        if (tile instanceof HTMLElement) {
          participantId = tile.dataset.livekitParticipant;
        }
        tile?.remove();
      }

      if (participantId) syncCameraParticipantIds();
    },
    [getCameraContainers, syncCameraParticipantIds],
  );

  const attachCamera = useCallback(
    (
      element: HTMLVideoElement,
      trackId: string,
      participantId: string,
      participantName: string,
      isLocal = false,
    ) => {
      removeCamera(trackId);
      const container =
        cameraHostsRef.current.get(participantId) ?? cameraParkingRef.current;
      if (!container) return;

      element.autoplay = true;
      element.playsInline = true;
      element.className = "h-full w-full object-cover";
      element.setAttribute("aria-label", `Камера: ${participantName}`);

      const tile = document.createElement("div");
      tile.dataset.livekitCamera = trackId;
      tile.dataset.livekitParticipant = participantId;
      if (isLocal || element.muted) tile.dataset.livekitLocalCamera = "true";
      tile.className = "absolute inset-0 overflow-hidden bg-black";
      tile.append(element);
      if (container === cameraParkingRef.current) {
        container.appendChild(tile);
      } else {
        container.replaceChildren(tile);
      }
      setCameraParticipantIds((current) => new Set(current).add(participantId));
    },
    [removeCamera],
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
          participant.identity,
          participant.name || participant.identity || "Участник",
        );
      }
    },
    [attachCamera, clearScreen],
  );

  const attachLocalVideo = useCallback(
    (publication: LocalTrackPublication, participantId: string) => {
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
        attachCamera(element, publication.trackSid, participantId, "Вы", true);
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
    const parkedCameras = cameraParkingRef.current;
    if (parkedCameras?.childNodes.length) {
      for (const tile of [...parkedCameras.children]) {
        if (!(tile instanceof HTMLElement)) continue;
        const participantId = tile.dataset.livekitParticipant;
        const cameraTarget = participantId
          ? cameraHostsRef.current.get(participantId)
          : null;
        cameraTarget?.replaceChildren(tile);
      }
    }
  }, []);

  const parkVisibleMedia = useCallback(() => {
    const screenSource = screenContainerRef.current;
    if (screenSource?.childNodes.length && screenParkingRef.current) {
      screenParkingRef.current.replaceChildren(...screenSource.childNodes);
    }
    if (cameraParkingRef.current) {
      for (const cameraSource of cameraHostsRef.current.values()) {
        if (cameraSource.childNodes.length) {
          cameraParkingRef.current.append(...cameraSource.childNodes);
        }
      }
    }
  }, []);

  const bindCameraContainer = useCallback(
    (participantId: string, element: HTMLDivElement | null) => {
      if (!element) {
        const current = cameraHostsRef.current.get(participantId);
        if (current?.childNodes.length && cameraParkingRef.current) {
          cameraParkingRef.current.append(...current.childNodes);
        }
        cameraHostsRef.current.delete(participantId);
        return;
      }

      cameraHostsRef.current.set(participantId, element);
      const parkedTile = [...(cameraParkingRef.current?.children ?? [])].find(
        (tile) =>
          tile instanceof HTMLElement &&
          tile.dataset.livekitParticipant === participantId,
      );
      if (parkedTile) element.replaceChildren(parkedTile);
    },
    [],
  );

  const clearVideoMedia = useCallback(() => {
    clearScreen();
    for (const container of cameraHostsRef.current.values()) {
      container.replaceChildren();
    }
    cameraParkingRef.current?.replaceChildren();
    setScreenSharing(false);
    setScreenShareOwner(null);
    setCameraEnabled(false);
    setCameraParticipantIds(new Set());
  }, [clearScreen]);

  const clearLocalCamera = useCallback(() => {
    for (const container of getCameraContainers()) {
      container
        ?.querySelectorAll<HTMLElement>("[data-livekit-local-camera]")
        .forEach((tile) => tile.remove());
    }
    setCameraEnabled(false);
    syncCameraParticipantIds();
  }, [getCameraContainers, syncCameraParticipantIds]);

  return {
    screenContainerRef,
    screenParkingRef,
    cameraParkingRef,
    bindCameraContainer,
    screenSharing,
    setScreenSharing,
    screenShareOwner,
    cameraEnabled,
    setCameraEnabled,
    cameraParticipantIds,
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
