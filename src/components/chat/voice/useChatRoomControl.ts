"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ForwardedRef } from "react";
import { ConnectionQuality, Room } from "livekit-client";

import { reportProductEvent } from "@/lib/telemetry/client";
import { resolveVoiceDockActiveSpeaker } from "@/lib/livekit/voice-dock-state";

import { getDirectCallPhase } from "./call-phase";
import { resolveVoiceRoomSurfacePhase } from "./voice-room-surface";
import type { ChatRoomControlHandle, ChatRoomControlProps } from "./chat-room-control-types";
import { getConnectionLabel, type MediaStatus } from "./voice-room-config";
import { playVoiceRoomSound } from "./voice-room-sounds";
import { useCallDuration } from "./useCallDuration";
import { useDesktopScreenAudioPublisher } from "./useDesktopScreenAudioPublisher";
import { useGroupSoundboard } from "./useGroupSoundboard";
import { useScreenShareSubscription } from "./useScreenShareSubscription";
import { useTerminalVoiceRecovery } from "./useTerminalVoiceRecovery";
import { useVoiceDeviceSettings } from "./useVoiceDeviceSettings";
import { useVoiceMediaActions } from "./useVoiceMediaActions";
import { useVoiceMediaConnection } from "./useVoiceMediaConnection";
import { useVoiceOutput } from "./useVoiceOutput";
import { useVoicePreferences } from "./useVoicePreferences";
import { useVoiceRoomEventConfigurator } from "./useVoiceRoomEventConfigurator";
import { useVoiceRoomRuntime } from "./useVoiceRoomRuntime";
import { useVoiceRoomSurfaceSession } from "./useVoiceRoomSurfaceSession";
import { useVoiceRoomTermination } from "./useVoiceRoomTermination";
import { useVoiceSessionOperation } from "./useVoiceSessionOperation";
import { useVoiceVideoStage } from "./useVoiceVideoStage";

/** Owns room orchestration and exposes presentation-ready cohesive models. */
export function useChatRoomControl(
  {
    chatId,
    chatName,
    chatType,
    renderTrigger = true,
    initialOpen = false,
    onStateChange,
    coreSession,
    initialCoreCredentials,
  }: ChatRoomControlProps,
  ref: ForwardedRef<ChatRoomControlHandle>,
) {
  const [open, setOpen] = useState(initialOpen);
  const [micMuted, setMicMuted] = useState(false);
  const [mediaStatus, setMediaStatus] = useState<MediaStatus>("idle");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState(ConnectionQuality.Unknown);
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<ReadonlySet<string>>(() => new Set());
  const [remoteMicMutedById, setRemoteMicMutedById] = useState<Record<string, boolean>>({});
  const liveRoomRef = useRef<Room | null>(null);
  const screenShareQualityRef = useRef<"standard" | "plus">("standard");
  const desiredMicMutedRef = useRef(false);
  const { preferences, preferencesRef, persistPreferences } = useVoicePreferences();

  const devices = useVoiceDeviceSettings({
    open,
    roomRef: liveRoomRef,
    mediaStatus,
    preferencesRef,
    persistPreferences,
    setMicMuted,
    setError: setMediaError,
  });
  const video = useVoiceVideoStage();
  const output = useVoiceOutput(liveRoomRef, preferences, persistPreferences);
  const screenSubscription = useScreenShareSubscription({
    roomRef: liveRoomRef,
    clearRemoteScreen: video.clearRemoteScreen,
    setAvailable: video.setScreenShareAvailable,
    setLocalSharing: video.setScreenSharing,
    setLocalAvailable: video.setLocalScreenAvailable,
    setWatching: video.setWatchingScreenShare,
  });
  const desktopAudio = useDesktopScreenAudioPublisher(
    chatId,
    screenSubscription.setExpectedLocalSessionId,
    !coreSession,
  );
  const soundboard = useGroupSoundboard(chatId, chatType === "group", liveRoomRef);
  const runtime = useVoiceRoomRuntime({
    chatId,
    open,
    coreSession,
    initialCoreCredentials,
    roomRef: liveRoomRef,
    cameraEnabled: video.cameraEnabled,
    screenSharing: video.screenSharing,
  });
  const { server, value, active, inside, participants, participantCount, heartbeat } = runtime;
  const sessionOperation = useVoiceSessionOperation();
  const durationLabel = useCallDuration(
    value?.startedAt ?? null,
    inside && value?.status === "active",
  );
  const meIsStarter = Boolean(
    value?.startedBy &&
      participants.find((participant) => participant.isMe)?.id === value.startedBy,
  );
  const { clearAudio } = output;
  const { clearVideoMedia } = video;
  const clearAttachedMedia = useCallback(() => {
    clearAudio();
    clearVideoMedia();
  }, [clearAudio, clearVideoMedia]);
  const recovery = useTerminalVoiceRecovery({
    sessionKind: server.kind,
    inside,
    roomRef: liveRoomRef,
    clearAttachedMedia,
    setMicMuted,
    setMediaStatus,
    setMediaError,
  });
  const { setConnectMedia: setRecoveryConnectMedia } = recovery;
  const mediaActions = useVoiceMediaActions({
    roomRef: liveRoomRef,
    preferencesRef,
    desiredMicMutedRef,
    screenShareQualityRef,
    mediaStatus,
    screenSharing: video.screenSharing,
    cameraEnabled: video.cameraEnabled,
    setMicMuted,
    setScreenSharing: video.setScreenSharing,
    setCameraEnabled: video.setCameraEnabled,
    clearLocalCamera: video.clearLocalCamera,
    clearLocalScreenShare: () => {
      screenSubscription.clearLocalShare();
      video.clearLocalScreen();
    },
    refreshDevices: devices.refreshDevices,
    sendHeartbeat: heartbeat.sendHeartbeat,
    toggleDesktopScreenAudio: desktopAudio.toggle,
    setError: setMediaError,
  });

  useEffect(() => {
    onStateChange?.({
      inside,
      mediaStatus,
      participantCount,
      micMuted,
      outputMuted: output.outputMuted,
    });
  }, [inside, mediaStatus, micMuted, onStateChange, output.outputMuted, participantCount]);
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(video.showParkedMedia, 0);
    return () => window.clearTimeout(timer);
  }, [open, video.showParkedMedia]);

  const configureRoomEvents = useVoiceRoomEventConfigurator({
    roomRef: liveRoomRef,
    roomSoundsEnabled: () => preferencesRef.current.roomSounds,
    attachAudio: output.attachAudio,
    attachRemoteVideo: video.attachRemoteVideo,
    detachRemoteVideo: video.detachRemoteVideo,
    attachLocalVideo: video.attachLocalVideo,
    detachLocalVideo: video.detachLocalVideo,
    stopDesktopScreenAudio: desktopAudio.stop,
    setMicMuted,
    setRemoteMicMutedById,
    setActiveSpeakerIds,
    setConnectionQuality,
    setAudioBlocked,
    setMediaStatus,
    setMediaError,
    syncRemotePublication: screenSubscription.syncPublication,
    removeRemotePublication: screenSubscription.removePublication,
    onDataReceived: soundboard.onDataReceived,
    handleDisconnected: recovery.handleDisconnected,
  });
  const mediaConnection = useVoiceMediaConnection({
    roomRef: liveRoomRef,
    preferencesRef,
    desiredMicMutedRef,
    screenShareQualityRef,
    getCredentials: server.mediaToken.get,
    configureRoom: configureRoomEvents,
    syncExistingPublications: screenSubscription.syncExisting,
    clearAttachedMedia,
    refreshDevices: devices.refreshDevices,
    stopDesktopScreenAudio: desktopAudio.stop,
    cancelRecovery: recovery.cancelRecovery,
    resetRecovery: recovery.resetRecovery,
    setMicMuted,
    setMediaStatus,
    setMediaError,
    setConnectionQuality,
    setAudioBlocked,
  });
  useVoiceRoomTermination(
    inside,
    server.room.isFetching,
    value?.endReason ?? null,
    mediaConnection.disconnect,
    setMediaError,
  );
  useEffect(() => {
    setRecoveryConnectMedia(mediaConnection.connect);
  }, [mediaConnection.connect, setRecoveryConnectMedia]);
  const surfaceSession = useVoiceRoomSurfaceSession({
    chatType,
    inside,
    active,
    startedAt: value?.startedAt ?? null,
    desiredMicMutedRef,
    server,
    mediaConnection,
    sessionOperation,
    setMediaError,
  });
  const {
    transition: sessionTransition,
    failedOperation: failedSessionOperation,
    resetSurface: resetSessionSurface,
    enterAndConnect,
    leaveRoom,
  } = surfaceSession;
  const toggleOutputWithMicrophone = async () => {
    if (!output.outputMuted && !micMuted) await mediaActions.toggleMicrophone();
    const muted = output.toggleOutput();
    void playVoiceRoomSound(muted ? "deafen" : "undeafen");
  };
  const openRoom = useCallback(() => {
    resetSessionSurface();
    setMediaError(null);
    setOpen(true);
    reportProductEvent("room_opened", { kind: chatType });
  }, [chatType, resetSessionSurface]);
  const closeRoom = () => {
    devices.micTest.stop();
    video.parkVisibleMedia();
    resetSessionSurface();
    setOpen(false);
  };
  const resumeAudio = async () => {
    const liveRoom = liveRoomRef.current;
    if (!liveRoom) return;
    await liveRoom.startAudio();
    setAudioBlocked(!liveRoom.canPlaybackAudio);
  };
  const reconnectMedia = async () => {
    const wasInside = inside;
    mediaConnection.disconnect();
    if (wasInside) await mediaConnection.connect();
  };

  useImperativeHandle(ref, () => ({
    open: openRoom,
    join: () => void enterAndConnect(),
    toggleMicrophone: () => void mediaActions.toggleMicrophone(),
    toggleOutput: () => void toggleOutputWithMicrophone(),
    leave: () => { if (inside) void leaveRoom(); },
  }));
  const isDirect = chatType === "direct";
  const connectionLabel = getConnectionLabel(mediaStatus);
  const selectedEndpoint =
    preferences.endpointUrl === "auto" ||
    mediaConnection.endpoints.some((endpoint) => endpoint.url === preferences.endpointUrl)
      ? preferences.endpointUrl
      : "auto";
  const errorMessage =
    mediaError ??
    server.room.error?.message ??
    server.enter.error?.message ??
    server.leave.error?.message ??
    server.access.error?.message ??
    server.mediaToken.error?.message ??
    desktopAudio.error ??
    soundboard.error ??
    (heartbeat.health === "degraded"
      ? "Связь с комнатой нестабильна. Voople продолжает попытки восстановить heartbeat."
      : null);
  const surfaceErrorMessage =
    mediaError ??
    server.room.error?.message ??
    server.enter.error?.message ??
    server.leave.error?.message ??
    server.mediaToken.error?.message ??
    null;
  const roomLoadFailed = Boolean(server.room.error);
  const connectPending =
    sessionTransition === "connecting" || server.enter.isPending ||
    server.mediaToken.isPending || mediaStatus === "connecting";
  const surfacePhase = resolveVoiceRoomSurfacePhase({
    transition: sessionTransition,
    loading: server.room.isLoading,
    inside,
    mediaStatus,
    hasError: Boolean(surfaceErrorMessage),
  });

  return {
    roots: {
      audioContainerRef: output.audioContainerRef,
      screenParkingRef: video.screenParkingRef,
      cameraParkingRef: video.cameraParkingRef,
    },
    trigger: renderTrigger ? {
      active, isDirect, mediaStatus, participantCount, onOpen: openRoom,
    } : null,
    dock: inside ? {
      chatName, participantCount, durationLabel, mediaStatus, connectionLabel,
      activeSpeakerName: resolveVoiceDockActiveSpeaker(participants, activeSpeakerIds),
      connectionQuality, micMuted, outputMuted: output.outputMuted,
      cameraEnabled: video.cameraEnabled,
      screenSharing: video.screenSharing,
      mediaActionPending: mediaActions.mediaActionPending,
      leavePending: sessionTransition === "leaving" || server.leave.isPending,
      onOpen: openRoom,
      onToggleMic: () => void mediaActions.toggleMicrophone(),
      onToggleOutput: () => void toggleOutputWithMicrophone(),
      onLeave: () => void leaveRoom(),
      preview: !open ? {
        screenContainerRef: video.bindScreenContainer,
        screenShareOwner: video.screenShareOwner,
        participants,
        activeSpeakerIds,
        cameraParticipantIds: video.cameraParticipantIds,
        onCameraContainerChange: video.bindCameraContainer,
        onOpen: openRoom,
      } : null,
    } : null,
    settings: {
      preferences,
      inputDevices: devices.inputDevices,
      outputDevices: devices.outputDevices,
      micTestActive: devices.micTest.active,
      micTestPending: devices.micTest.pending,
      micTestLevel: devices.micTest.level,
      endpoints: mediaConnection.endpoints,
      selectedEndpoint,
      currentEndpoint: mediaConnection.currentEndpoint,
      mediaStatus,
      outputGain: output.outputGain,
      onInputDeviceChange: devices.changeInputDevice,
      onOutputDeviceChange: devices.changeOutputDevice,
      onMicTestToggle: devices.micTest.toggle,
      onRefreshDevices: () => devices.refreshDevices(true),
      onAudioProcessingChange: devices.changeAudioProcessing,
      onEndpointChange: (endpointUrl: string) => persistPreferences({ endpointUrl }),
      onCompatibilityModeChange: (compatibilityMode: boolean) => persistPreferences({ compatibilityMode }),
      onRoomSoundsChange: (roomSounds: boolean) => persistPreferences({ roomSounds }),
      onMicrophoneGainChange: devices.changeMicrophoneGain,
      onOutputGainChange: output.setOutputGain,
      onScreenAudioProcessChange: (screenAudioProcessId: number | null) => persistPreferences({ screenAudioProcessId }),
      onReconnect: reconnectMedia,
    },
    sheet: {
      overlay: { open, onClose: closeRoom },
      identity: {
        isDirect,
        callPhase: getDirectCallPhase({ direct: isDirect, room: value, starter: meIsStarter }),
        chatName,
        active,
        durationLabel,
      },
      connection: {
        label: connectionLabel,
        status: mediaStatus,
        quality: connectionQuality,
        audioBlocked,
        errorMessage,
        onResumeAudio: resumeAudio,
      },
      stage: {
        screenContainerRef: video.bindScreenContainer,
        screenShareOwner: video.screenShareOwner,
        screenShareAvailable: video.screenShareAvailable,
        screenShareTrackId: video.screenShareTrackId,
        screenShareIsLocal: video.screenShareIsLocal,
        watchingScreenShare: video.watchingScreenShare,
        screenShareVolume: output.screenShareVolume,
        participants,
        groupSounds: soundboard.sounds,
        participantVolumes: output.participantVolumes,
        remoteMicMutedById,
        activeSpeakerIds,
        cameraParticipantIds: video.cameraParticipantIds,
        onCameraContainerChange: video.bindCameraContainer,
        onParticipantVolumeChange: output.setParticipantVolume,
        onScreenShareVolumeChange: output.setScreenShareVolume,
        onGroupSoundPlay: (sound: (typeof soundboard.sounds)[number]) => void soundboard.play(sound),
        onWatchScreenShare: () => {
          video.restoreLocalScreenPreview();
          screenSubscription.watch();
        },
        onStopWatchingScreenShare: screenSubscription.stopWatching,
      },
      controls: {
        micMuted,
        outputMuted: output.outputMuted,
        mediaActionPending: mediaActions.mediaActionPending,
        screenSharePending: mediaActions.screenSharePending,
        screenSharing: video.screenSharing,
        screenShareHasAudio: mediaActions.screenShareHasAudio,
        cameraEnabled: video.cameraEnabled,
        cameraPending: mediaActions.cameraPending,
        onMicToggle: mediaActions.toggleMicrophone,
        onOutputToggle: () => void toggleOutputWithMicrophone(),
        onScreenShareToggle: mediaActions.toggleScreenShare,
        onCameraToggle: mediaActions.toggleCamera,
      },
      access: {
        canManage: server.access.supported && meIsStarter && active && !isDirect,
        mode: (value?.accessMode ?? "open") as "open" | "locked",
        pending: server.access.isPending,
        onToggle: () => server.access.set(
          value?.accessMode === "locked" ? "open" : "locked",
        ),
      },
      session: {
        phase: surfacePhase,
        inside,
        leavePending: sessionTransition === "leaving" || server.leave.isPending,
        onLeave: leaveRoom,
        connectPending,
        connectDisabled:
          connectPending || sessionTransition === "leaving" || server.leave.isPending || server.room.isLoading ||
          (value?.status === "active" && value.accessMode === "locked" && !inside),
        onConnect: enterAndConnect,
        connectLabel: inside
          ? "Подключить звук"
          : active
            ? value?.status === "ringing" ? "Ответить" : "Войти в комнату"
            : isDirect ? "Открыть комнату" : "Начать комнату",
        retryLabel:
          failedSessionOperation === "leave"
            ? "Повторить выход"
            : roomLoadFailed
              ? "Повторить загрузку"
            : "Повторить подключение",
        retryPending:
          sessionTransition === "connecting" ||
          sessionTransition === "leaving" ||
          (roomLoadFailed
            ? server.room.isFetching
            : failedSessionOperation === "leave"
              ? false
              : server.enter.isPending || server.mediaToken.isPending),
        onRetry:
          failedSessionOperation === "leave"
            ? leaveRoom
            : roomLoadFailed
              ? () => void server.room.refetch()
              : enterAndConnect,
      },
    },
    picker: desktopAudio.capturePicker ? {
      sources: desktopAudio.capturePicker,
      onSelect: desktopAudio.selectCaptureSource,
      onClose: desktopAudio.cancelCaptureSource,
    } : null,
  };
}

export type ChatRoomController = ReturnType<typeof useChatRoomControl>;
