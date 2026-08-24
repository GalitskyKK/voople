"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ConnectionQuality, Room } from "livekit-client";
import { loadVoicePreferences, saveVoicePreferences, type VoicePreferences } from "@/lib/livekit/voice-preferences";
import { reportProductEvent } from "@/lib/telemetry/client";
import {
  getConnectionLabel,
  type MediaStatus,
  type VoiceControlState,
} from "./voice/voice-room-config";
import { VoiceRoomSheet } from "./voice/VoiceRoomSheet";
import { VoiceRoomTrigger } from "./voice/VoiceRoomTrigger";
import { VoiceSettingsPanel } from "./voice/VoiceSettingsPanel";
import { VoiceMiniStage } from "./voice/VoiceMiniStage";
import { VoiceSessionDock } from "./voice/VoiceSessionDock";
import { useCallDuration } from "./voice/useCallDuration";
import { useVoiceHeartbeat } from "./voice/useVoiceHeartbeat";
import { useVoiceOutput } from "./voice/useVoiceOutput";
import { useVoiceRoomTermination } from "./voice/useVoiceRoomTermination";
import { useVoiceVideoStage } from "./voice/useVoiceVideoStage";
import { useScreenShareSubscription } from "./voice/useScreenShareSubscription";
import { getDirectCallPhase } from "./voice/call-phase";
import { useDesktopScreenAudioPublisher } from "./voice/useDesktopScreenAudioPublisher";
import { ScreenShareSourcePicker } from "./voice/ScreenShareSourcePicker";
import { useGroupSoundboard } from "./voice/useGroupSoundboard";
import { useTerminalVoiceRecovery } from "./voice/useTerminalVoiceRecovery";
import { useVoiceDeviceSettings } from "./voice/useVoiceDeviceSettings";
import { useVoiceMediaActions } from "./voice/useVoiceMediaActions";
import { useVoiceMediaConnection } from "./voice/useVoiceMediaConnection";
import { useVoiceRoomEventConfigurator } from "./voice/useVoiceRoomEventConfigurator";
import { useVoiceRoomServerSession } from "./voice/useVoiceRoomServerSession";
import { playVoiceRoomSound } from "./voice/voice-room-sounds";
type ChatRoomControlProps = {
  chatId: string;
  chatName: string;
  chatType: "direct" | "group";
  renderTrigger?: boolean;
  initialOpen?: boolean;
  onStateChange?: (state: VoiceControlState) => void;
};
export type ChatRoomControlHandle = { open: () => void; join: () => void; toggleMicrophone: () => void; toggleOutput: () => void; leave: () => void };
export const ChatRoomControl = forwardRef<ChatRoomControlHandle, ChatRoomControlProps>(function ChatRoomControl({
  chatId,
  chatName,
  chatType,
  renderTrigger = true,
  initialOpen = false,
  onStateChange,
}, ref) {
  const [open, setOpen] = useState(initialOpen);
  const [micMuted, setMicMuted] = useState(false); // Микрофон всегда сразу включен
  const [mediaStatus, setMediaStatus] = useState<MediaStatus>("idle");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState(ConnectionQuality.Unknown);
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<ReadonlySet<string>>(() => new Set());
  const [remoteMicMutedById, setRemoteMicMutedById] = useState<Record<string, boolean>>({});
  const [preferences, setPreferences] = useState(() => loadVoicePreferences());
  const liveRoomRef = useRef<Room | null>(null);
  const preferencesRef = useRef(preferences);
  const screenShareQualityRef = useRef<"standard" | "plus">("standard");
  const desiredMicMutedRef = useRef(false);
  const persistPreferences = useCallback((patch: Partial<VoicePreferences>) => {
    const next = { ...preferencesRef.current, ...patch };
    preferencesRef.current = next;
    setPreferences(next);
    saveVoicePreferences(next);
    return next;
  }, []);
  const {
    inputDevices,
    outputDevices,
    refreshDevices,
    micTest,
    changeInputDevice,
    changeOutputDevice,
    changeAudioProcessing,
    changeMicrophoneGain,
  } = useVoiceDeviceSettings({
    open,
    roomRef: liveRoomRef,
    mediaStatus,
    preferencesRef,
    persistPreferences,
    setMicMuted,
    setError: setMediaError,
  });
  const {
    bindScreenContainer,
    screenParkingRef,
    cameraParkingRef,
    bindCameraContainer,
    screenSharing,
    setScreenSharing,
    screenShareOwner,
    screenShareAvailable,
    setScreenShareAvailable,
    watchingScreenShare,
    setWatchingScreenShare,
    cameraEnabled,
    setCameraEnabled,
    cameraParticipantIds,
    attachRemoteVideo,
    attachLocalVideo,
    detachRemoteVideo,
    detachLocalVideo,
    clearLocalCamera,
    clearRemoteScreen,
    showParkedMedia,
    parkVisibleMedia,
    clearVideoMedia,
  } = useVoiceVideoStage();
  const {
    audioContainerRef,
    outputMuted,
    outputGain,
    participantVolumes,
    screenShareVolume,
    attachAudio,
    clearAudio,
    toggleOutput,
    setOutputGain,
    setParticipantVolume,
    setScreenShareVolume,
  } = useVoiceOutput(liveRoomRef, preferences, persistPreferences);
  const screenSubscription = useScreenShareSubscription({
    roomRef: liveRoomRef,
    clearRemoteScreen,
    setAvailable: setScreenShareAvailable,
    setWatching: setWatchingScreenShare,
  });
  const { toggle: toggleDesktopScreenAudio, stop: stopDesktopScreenAudio, error: desktopScreenAudioError, capturePicker, selectCaptureSource, cancelCaptureSource } = useDesktopScreenAudioPublisher(chatId);
  const groupSoundboard = useGroupSoundboard(chatId, chatType === "group", liveRoomRef);
  const { access, enter, leave, mediaToken, room, utils } =
    useVoiceRoomServerSession(chatId, open);
  const value = room.data;
  const active = value?.status === "active" || value?.status === "ringing";
  const inside = Boolean(value?.isInside);
  const participantCount = value?.participants.length ?? 0;
  const durationLabel = useCallDuration(
    value?.startedAt ?? null,
    inside && value?.status === "active",
  );
  const { sendHeartbeat, health: heartbeatHealth } = useVoiceHeartbeat(chatId, inside, liveRoomRef);
  const meIsStarter = Boolean(
    value?.startedBy &&
      value.participants.find((participant) => participant.isMe)?.id === value.startedBy,
  );
  const clearAttachedMedia = useCallback(() => {
    clearAudio();
    clearVideoMedia();
  }, [clearAudio, clearVideoMedia]);
  const {
    connectMediaRef,
    handleDisconnected,
    resetRecovery,
    cancelRecovery,
  } = useTerminalVoiceRecovery({
    chatId,
    inside,
    roomRef: liveRoomRef,
    clearAttachedMedia,
    setMicMuted,
    setMediaStatus,
    setMediaError,
  });
  const {
    mediaActionPending,
    screenSharePending, screenShareHasAudio,
    cameraPending,
    toggleMicrophone: toggleMic,
    toggleScreenShare,
    toggleCamera,
  } = useVoiceMediaActions({
    roomRef: liveRoomRef,
    preferencesRef,
    desiredMicMutedRef,
    screenShareQualityRef,
    mediaStatus,
    screenSharing,
    cameraEnabled,
    setMicMuted,
    setScreenSharing,
    setCameraEnabled,
    clearLocalCamera,
    refreshDevices,
    sendHeartbeat,
    toggleDesktopScreenAudio,
    setError: setMediaError,
  });
  useEffect(() => {
    onStateChange?.({ inside, mediaStatus, participantCount, micMuted, outputMuted });
  }, [inside, mediaStatus, micMuted, onStateChange, outputMuted, participantCount]);
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      showParkedMedia();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, showParkedMedia]);
  const configureRoomEvents = useVoiceRoomEventConfigurator({
    roomRef: liveRoomRef,
    roomSoundsEnabled: () => preferencesRef.current.roomSounds,
    attachAudio,
    attachRemoteVideo,
    detachRemoteVideo,
    attachLocalVideo,
    detachLocalVideo,
    stopDesktopScreenAudio,
    setMicMuted,
    setRemoteMicMutedById,
    setActiveSpeakerIds,
    setConnectionQuality,
    setAudioBlocked,
    setMediaStatus,
    setMediaError,
    syncRemotePublication: screenSubscription.syncPublication,
    removeRemotePublication: screenSubscription.removePublication,
    onDataReceived: groupSoundboard.onDataReceived,
    handleDisconnected,
  });
  const {
    endpoints,
    currentEndpoint,
    connect: connectMedia,
    disconnect: disconnectMedia,
  } = useVoiceMediaConnection({
    roomRef: liveRoomRef,
    preferencesRef,
    desiredMicMutedRef,
    screenShareQualityRef,
    getCredentials: () => mediaToken.mutateAsync({ chatId }),
    configureRoom: configureRoomEvents,
    syncExistingPublications: screenSubscription.syncExisting,
    clearAttachedMedia,
    refreshDevices,
    stopDesktopScreenAudio,
    cancelRecovery,
    resetRecovery,
    setMicMuted,
    setMediaStatus,
    setMediaError,
    setConnectionQuality,
    setAudioBlocked,
  });
  useVoiceRoomTermination(
    inside, room.isFetching, value?.endReason ?? null, disconnectMedia, setMediaError,
  );

  const enterAndConnect = async () => {
    setMediaError(null);
    try {
      if (!inside) {
        const nextRoom = await enter.mutateAsync({ chatId, micMuted });
        utils.chat.room.setData({ chatId }, nextRoom);
        if (!active) reportProductEvent("room_created", { kind: chatType });
      }
      await connectMedia();
      reportProductEvent("room_joined", { kind: chatType });
    } catch {
      // Ошибка мутации уже отображается ниже.
    }
  };

  const leaveRoom = async () => {
    disconnectMedia();
    await leave.mutateAsync({ chatId });
    reportProductEvent("room_left", { durationSeconds: value?.startedAt ? Math.max(0, Math.round((Date.now() - new Date(value.startedAt).getTime()) / 1000)) : 0 });
  };

  const toggleOutputWithMicrophone = async () => {
    if (!outputMuted && !micMuted) await toggleMic();
    const muted = toggleOutput();
    void playVoiceRoomSound(muted ? "deafen" : "undeafen");
  };

  const openRoom = useCallback(() => {
    setMediaError(null);
    setOpen(true);
    reportProductEvent("room_opened", { kind: chatType });
  }, [chatType]);

  useImperativeHandle(ref, () => ({
    open: openRoom, join: () => void enterAndConnect(),
    toggleMicrophone: () => void toggleMic(), toggleOutput: () => void toggleOutputWithMicrophone(),
    leave: () => { if (inside) void leaveRoom(); },
  }));

  connectMediaRef.current = connectMedia;

  const resumeAudio = async () => {
    const liveRoom = liveRoomRef.current;
    if (!liveRoom) return;
    await liveRoom.startAudio();
    setAudioBlocked(!liveRoom.canPlaybackAudio);
  };

  const reconnectMedia = async () => {
    const wasInside = inside;
    disconnectMedia();
    if (wasInside) await connectMedia();
  };

  const isDirect = chatType === "direct";
  const callPhase = getDirectCallPhase({ direct: isDirect, room: value, starter: meIsStarter });
  const connectionLabel = getConnectionLabel(mediaStatus);
  const selectedEndpoint =
    preferences.endpointUrl === "auto" ||
    endpoints.some((endpoint) => endpoint.url === preferences.endpointUrl)
      ? preferences.endpointUrl
      : "auto";

  return (
    <>
      {renderTrigger ? (
        <VoiceRoomTrigger
          active={active}
          isDirect={isDirect}
          mediaStatus={mediaStatus}
          participantCount={participantCount}
          onOpen={openRoom}
        />
      ) : null}

      <div ref={audioContainerRef} hidden aria-hidden="true" />
      <div ref={screenParkingRef} className="pointer-events-none fixed -left-[10000px] top-0 h-px w-px overflow-hidden opacity-0" aria-hidden="true" />
      <div ref={cameraParkingRef} className="pointer-events-none fixed -left-[10000px] top-0 h-px w-px overflow-hidden opacity-0" aria-hidden="true" />

      {inside ? (
        <VoiceSessionDock
          chatName={chatName}
          participantCount={participantCount}
          durationLabel={durationLabel}
          mediaStatus={mediaStatus}
          connectionLabel={connectionLabel}
          connectionQuality={connectionQuality}
          micMuted={micMuted}
          outputMuted={outputMuted}
          mediaActionPending={mediaActionPending}
          leavePending={leave.isPending}
          mediaPreview={
            !open ? (
              <VoiceMiniStage
                screenContainerRef={bindScreenContainer}
                screenShareOwner={screenShareOwner}
                participants={value?.participants ?? []}
                activeSpeakerIds={activeSpeakerIds}
                cameraParticipantIds={cameraParticipantIds}
                onCameraContainerChange={bindCameraContainer}
                onOpen={openRoom}
              />
            ) : undefined
          }
          onOpen={openRoom}
          onToggleMic={() => void toggleMic()}
          onToggleOutput={() => void toggleOutputWithMicrophone()}
          onLeave={() => void leaveRoom()}
        />
      ) : null}

      <VoiceRoomSheet
        open={open}
        onClose={() => {
          micTest.stop();
          parkVisibleMedia();
          setOpen(false);
        }}
        screenContainerRef={bindScreenContainer}
        isDirect={isDirect}
        callPhase={callPhase}
        chatName={chatName}
        active={active}
        durationLabel={durationLabel}
        connectionLabel={connectionLabel}
        mediaStatus={mediaStatus}
        connectionQuality={connectionQuality}
        screenShareOwner={screenShareOwner}
        screenShareAvailable={screenShareAvailable}
        watchingScreenShare={watchingScreenShare}
        screenShareVolume={screenShareVolume}
        participants={value?.participants ?? []}
        groupSounds={groupSoundboard.sounds}
        participantVolumes={participantVolumes}
        micMuted={micMuted}
        outputMuted={outputMuted}
        remoteMicMutedById={remoteMicMutedById}
        activeSpeakerIds={activeSpeakerIds}
        mediaActionPending={mediaActionPending}
        screenSharePending={screenSharePending}
        screenSharing={screenSharing}
        screenShareHasAudio={screenShareHasAudio}
        cameraParticipantIds={cameraParticipantIds}
        cameraEnabled={cameraEnabled}
        cameraPending={cameraPending}
        audioBlocked={audioBlocked}
        onMicToggle={toggleMic}
        onOutputToggle={() => void toggleOutputWithMicrophone()}
        onScreenShareToggle={toggleScreenShare}
        onCameraToggle={toggleCamera}
        onResumeAudio={resumeAudio}
        onCameraContainerChange={bindCameraContainer}
        onParticipantVolumeChange={setParticipantVolume}
        onScreenShareVolumeChange={setScreenShareVolume}
        onGroupSoundPlay={(sound) => void groupSoundboard.play(sound)}
        onWatchScreenShare={screenSubscription.watch}
        onStopWatchingScreenShare={screenSubscription.stopWatching}
        settingsPanel={
          <VoiceSettingsPanel
            preferences={preferences}
            inputDevices={inputDevices}
            outputDevices={outputDevices}
            micTestActive={micTest.active}
            micTestLevel={micTest.level}
            endpoints={endpoints}
            selectedEndpoint={selectedEndpoint}
            currentEndpoint={currentEndpoint}
            mediaStatus={mediaStatus}
            onInputDeviceChange={changeInputDevice}
            onOutputDeviceChange={changeOutputDevice}
            onMicTestToggle={micTest.toggle}
            onRefreshDevices={() => refreshDevices(true)}
            onAudioProcessingChange={changeAudioProcessing}
            onEndpointChange={(endpointUrl) => persistPreferences({ endpointUrl })}
            onCompatibilityModeChange={(compatibilityMode) =>
              persistPreferences({ compatibilityMode })
            }
            onRoomSoundsChange={(roomSounds) => persistPreferences({ roomSounds })}
            outputGain={outputGain}
            onMicrophoneGainChange={changeMicrophoneGain}
            onOutputGainChange={setOutputGain}
            onScreenAudioProcessChange={(screenAudioProcessId) =>
              persistPreferences({ screenAudioProcessId })}
            onReconnect={reconnectMedia}
          />
        }
        canManageAccess={meIsStarter && active && !isDirect}
        accessMode={value?.accessMode ?? "open"}
        accessPending={access.isPending}
        onAccessToggle={() =>
          access.mutate({
            chatId,
            accessMode: value?.accessMode === "locked" ? "open" : "locked",
          })
        }
        inside={inside}
        errorMessage={
          mediaError ??
          enter.error?.message ??
          leave.error?.message ??
          access.error?.message ??
          mediaToken.error?.message ??
          desktopScreenAudioError ??
          groupSoundboard.error ??
          (heartbeatHealth === "degraded"
            ? "Связь с комнатой нестабильна. Voople продолжает попытки восстановить heartbeat."
            : null) ??
          null
        }
        leavePending={leave.isPending}
        onLeave={leaveRoom}
        connectPending={
          enter.isPending || mediaToken.isPending || mediaStatus === "connecting"
        }
        connectDisabled={
          enter.isPending ||
          mediaToken.isPending ||
          mediaStatus === "connecting" ||
          room.isLoading ||
          (value?.status === "active" && value.accessMode === "locked" && !inside)
        }
        onConnect={enterAndConnect}
        connectLabel={
          inside
            ? "Подключить звук"
            : active
              ? value?.status === "ringing"
                ? "Ответить"
                : "Войти в комнату"
              : isDirect
                ? "Открыть комнату"
                : "Начать комнату"
        }
      />
      {capturePicker ? <ScreenShareSourcePicker sources={capturePicker} onSelect={selectCaptureSource} onClose={cancelCaptureSource} /> : null}
    </>
  );
});

export type { VoiceControlState } from "./voice/voice-room-config";
