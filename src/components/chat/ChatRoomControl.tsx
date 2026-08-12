"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  ConnectionQuality,
  ConnectionState,
  LocalAudioTrack,
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client";
import { loadVoicePreferences, saveVoicePreferences, type VoicePreferences } from "@/lib/livekit/voice-preferences";
import { syncRnnoiseProcessor } from "@/lib/livekit/rnnoise-track-processor";
import { trpc } from "@/lib/trpc/client";
import {
  getAudioCaptureOptions,
  ECHO_SAFE_SCREEN_SHARE_OPTIONS,
  getConnectionLabel,
  getMicrophoneMuted,
  reconnectPolicy,
  VOICE_PUBLISH_OPTIONS,
  type LiveKitEndpoint,
  type MediaStatus,
  type VoiceControlState,
} from "./voice/voice-room-config";
import { VoiceRoomSheet } from "./voice/VoiceRoomSheet";
import { VoiceRoomTrigger } from "./voice/VoiceRoomTrigger";
import { VoiceSettingsPanel } from "./voice/VoiceSettingsPanel";
import { configureVoiceRoomEvents } from "./voice/configureVoiceRoomEvents";
import { VoiceMiniStage } from "./voice/VoiceMiniStage";
import { VoiceSessionDock } from "./voice/VoiceSessionDock";
import { useCallDuration } from "./voice/useCallDuration";
import { useVoiceHeartbeat } from "./voice/useVoiceHeartbeat";
import { useVoiceOutput } from "./voice/useVoiceOutput";
import { useVoiceRoomTermination } from "./voice/useVoiceRoomTermination";
import { useVoiceVideoStage } from "./voice/useVoiceVideoStage";
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

export const ChatRoomControl = forwardRef<
  ChatRoomControlHandle,
  ChatRoomControlProps
>(function ChatRoomControl({
  chatId,
  chatName,
  chatType,
  renderTrigger = true,
  initialOpen = false,
  onStateChange,
}, ref) {
  const [open, setOpen] = useState(initialOpen);
  const [micMuted, setMicMuted] = useState(true);
  const [mediaStatus, setMediaStatus] = useState<MediaStatus>("idle");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaActionPending, setMediaActionPending] = useState(false);
  const [screenSharePending, setScreenSharePending] = useState(false);
  const [cameraPending, setCameraPending] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState(ConnectionQuality.Unknown);
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<ReadonlySet<string>>(() => new Set());
  const [remoteMicMutedById, setRemoteMicMutedById] = useState<Record<string, boolean>>({});
  const [preferences, setPreferences] = useState(() => loadVoicePreferences());
  const [endpoints, setEndpoints] = useState<LiveKitEndpoint[]>([]);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [micTestActive, setMicTestActive] = useState(false);
  const [micTestLevel, setMicTestLevel] = useState(0);

  const liveRoomRef = useRef<Room | null>(null);
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  const connectSequenceRef = useRef(0);
  const mountedRef = useRef(true);
  const preferencesRef = useRef(preferences);
  const mediaActionRef = useRef(false);
  const micTestStreamRef = useRef<MediaStream | null>(null);
  const micTestContextRef = useRef<AudioContext | null>(null);
  const micTestFrameRef = useRef<number | null>(null);
  const {
    bindScreenContainer,
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
  } = useVoiceVideoStage();
  const {
    audioContainerRef,
    outputMuted,
    participantVolumes,
    attachAudio,
    clearAudio,
    toggleOutput,
    setParticipantVolume,
  } = useVoiceOutput(liveRoomRef);
  const utils = trpc.useUtils();
  const room = trpc.chat.room.useQuery(
    { chatId },
    { staleTime: 5_000, refetchInterval: open ? 5_000 : 15_000 },
  );

  const enter = trpc.chat.enterRoom.useMutation();
  const mediaToken = trpc.chat.roomMediaToken.useMutation();
  const leave = trpc.chat.leaveRoom.useMutation({
    onSuccess: () => {
      void utils.chat.room.invalidate({ chatId });
    },
  });

  const access = trpc.chat.setRoomAccess.useMutation({
    onSuccess: () => void utils.chat.room.invalidate({ chatId }),
  });

  const value = room.data;
  const active = value?.status === "active" || value?.status === "ringing";
  const inside = Boolean(value?.isInside);
  const participantCount = value?.participants.length ?? 0;
  const durationLabel = useCallDuration(
    value?.startedAt ?? null,
    inside && value?.status === "active",
  );
  const sendHeartbeat = useVoiceHeartbeat(chatId, inside, liveRoomRef);
  const meIsStarter = Boolean(
    value?.startedBy &&
      value.participants.find((participant) => participant.isMe)?.id === value.startedBy,
  );

  useEffect(() => {
    onStateChange?.({ inside, mediaStatus, participantCount, micMuted, outputMuted });
  }, [inside, mediaStatus, micMuted, onStateChange, outputMuted, participantCount]);

  const persistPreferences = (patch: Partial<VoicePreferences>) => {
    const next = { ...preferencesRef.current, ...patch };
    preferencesRef.current = next;
    setPreferences(next);
    saveVoicePreferences(next);
    return next;
  };

  const stopMicTest = (updateState = true) => {
    if (micTestFrameRef.current !== null) cancelAnimationFrame(micTestFrameRef.current);
    micTestFrameRef.current = null;
    micTestStreamRef.current?.getTracks().forEach((track) => track.stop());
    micTestStreamRef.current = null;
    void micTestContextRef.current?.close();
    micTestContextRef.current = null;
    if (updateState && mountedRef.current) {
      setMicTestActive(false);
      setMicTestLevel(0);
    }
  };

  const refreshDevices = useCallback(async (requestPermissions = false) => {
    try {
      const [inputs, outputs] = await Promise.all([
        Room.getLocalDevices("audioinput", requestPermissions),
        Room.getLocalDevices("audiooutput", false),
      ]);
      if (!mountedRef.current) return;
      setInputDevices(inputs);
      setOutputDevices(outputs);
    } catch {
      // Список может быть пустым до первого разрешения на микрофон.
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void refreshDevices();
      showParkedMedia();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, refreshDevices, showParkedMedia]);

  useEffect(() => {
    if (!open || !navigator.mediaDevices?.addEventListener) return;
    const handleDeviceChange = () => void refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, [open, refreshDevices]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      connectSequenceRef.current += 1;
      stopMicTest(false);
      const current = liveRoomRef.current;
      liveRoomRef.current = null;
      void current?.disconnect();
    };
  }, []);

  const clearAttachedMedia = useCallback(() => {
    clearAudio();
    clearVideoMedia();
  }, [clearAudio, clearVideoMedia]);

  const disconnectMedia = useCallback(() => {
    connectSequenceRef.current += 1;
    connectPromiseRef.current = null;
    const current = liveRoomRef.current;
    liveRoomRef.current = null;
    clearAttachedMedia();
    void current?.disconnect();
    setMicMuted(true);
    setMediaStatus("idle");
    setConnectionQuality(ConnectionQuality.Unknown);
    setCurrentEndpoint(null);
  }, [clearAttachedMedia]);

  useVoiceRoomTermination(
    inside, room.isFetching, value?.endReason ?? null, disconnectMedia, setMediaError,
  );

  const attachRemoteTrack = (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => {
    if (track.kind === Track.Kind.Audio) {
      attachAudio(track, participant);
      return;
    }

    attachRemoteVideo(track, publication, participant);
  };

  const configureRoomEvents = (liveRoom: Room) => {
    configureVoiceRoomEvents({
      room: liveRoom,
      isCurrent: () => liveRoomRef.current === liveRoom && mountedRef.current,
      onRemoteTrack: attachRemoteTrack,
      onRemoteTrackDetached: detachRemoteVideo,
      onLocalVideoPublished: attachLocalVideo,
      onLocalVideoUnpublished: detachLocalVideo,
      onMicrophonesChange: (localMuted, remoteMutedById) => {
        setMicMuted(localMuted);
        setRemoteMicMutedById(remoteMutedById);
      },
      onActiveSpeakersChange: setActiveSpeakerIds,
      onConnectionQualityChange: setConnectionQuality,
      onAudioBlockedChange: setAudioBlocked,
      onReconnecting: () => setMediaStatus("reconnecting"),
      onReconnected: () => {
        setMediaStatus("connected");
        setMediaError(null);
      },
      onParticipantConnected: () => preferencesRef.current.roomSounds && void playVoiceRoomSound("join"),
      onParticipantDisconnected: () => preferencesRef.current.roomSounds && void playVoiceRoomSound("leave"),
    });

    liveRoom.on(RoomEvent.Disconnected, () => {
        if (liveRoomRef.current !== liveRoom) return;
        liveRoomRef.current = null;
        clearAttachedMedia();
        setMicMuted(true);
        setMediaStatus("error");
        setMediaError("Соединение прервалось. Нажмите «Подключить звук», чтобы войти снова.");
      });
  };

  const connectMedia = async () => {
    const current = liveRoomRef.current;
    if (
      current &&
      (current.state === ConnectionState.Connected ||
        current.state === ConnectionState.Reconnecting ||
        current.state === ConnectionState.Connecting)
    ) {
      return;
    }
    if (connectPromiseRef.current) return connectPromiseRef.current;

    const sequence = ++connectSequenceRef.current;
    const task = (async () => {
      setMediaStatus("connecting");
      setMediaError(null);

      try {
        const credentials = await mediaToken.mutateAsync({ chatId });
        if (!credentials.enabled) {
          setMediaStatus("unavailable");
          return;
        }

        const availableEndpoints = credentials.endpoints?.length
          ? credentials.endpoints
          : [{ url: credentials.url, label: "Авто" }];
        setEndpoints(availableEndpoints);

        const preferredUrl = preferencesRef.current.endpointUrl;
        const orderedEndpoints =
          preferredUrl === "auto"
            ? availableEndpoints
            : [
                ...availableEndpoints.filter((endpoint) => endpoint.url === preferredUrl),
                ...availableEndpoints.filter((endpoint) => endpoint.url !== preferredUrl),
              ];

        let lastError: unknown;
        for (const endpoint of orderedEndpoints) {
          if (sequence !== connectSequenceRef.current || !mountedRef.current) return;

          const liveRoom = new Room({
            adaptiveStream: true,
            dynacast: true,
            webAudioMix: true,
            reconnectPolicy,
            disconnectOnPageLeave: true,
            audioCaptureDefaults: getAudioCaptureOptions(preferencesRef.current),
            publishDefaults: {
              ...VOICE_PUBLISH_OPTIONS,
              stopMicTrackOnMute: false,
            },
          });
          configureRoomEvents(liveRoom);
          liveRoomRef.current = liveRoom;

          try {
            await liveRoom.prepareConnection(endpoint.url, credentials.token);
            await liveRoom.connect(endpoint.url, credentials.token, {
              maxRetries: 3,
              websocketTimeout: 15_000,
              peerConnectionTimeout: 20_000,
              rtcConfig: preferencesRef.current.compatibilityMode
                ? { iceTransportPolicy: "relay" }
                : undefined,
            });
          } catch (error) {
            lastError = error;
            if (liveRoomRef.current === liveRoom) liveRoomRef.current = null;
            void liveRoom.disconnect();
            continue;
          }

          if (sequence !== connectSequenceRef.current || !mountedRef.current) {
            liveRoomRef.current = null;
            void liveRoom.disconnect();
            return;
          }

          setCurrentEndpoint(endpoint.url);
          setMediaStatus("connected");
          setConnectionQuality(liveRoom.localParticipant.connectionQuality);
          await liveRoom.startAudio().catch(() => setAudioBlocked(true));
          if (preferencesRef.current.outputDeviceId !== "default") {
            await liveRoom
              .switchActiveDevice("audiooutput", preferencesRef.current.outputDeviceId)
              .catch(() => undefined);
          }

          if (!micMuted) {
            try {
              await liveRoom.localParticipant.setMicrophoneEnabled(
                true,
                getAudioCaptureOptions(preferencesRef.current),
                VOICE_PUBLISH_OPTIONS,
              );
              const rnnoiseError = await syncRnnoiseProcessor(liveRoom,
                preferencesRef.current.enhancedNoiseSuppression);
              if (rnnoiseError) setMediaError(rnnoiseError);
            } catch (error) {
              // A failed publication must not tear down an already healthy
              // signal connection. The microphone can be retried separately.
              setMediaError(
                error instanceof Error && error.message.includes("timed out")
                  ? "Сервер не подтвердил микрофон. Комната осталась подключена — повторите включение или используйте совместимый режим."
                  : error instanceof Error
                    ? error.message
                    : "Не удалось включить микрофон.",
              );
            }
          }

          setMicMuted(getMicrophoneMuted(liveRoom));
          await refreshDevices();
          return;
        }

        throw lastError ?? new Error("Нет доступного медиасервера");
      } catch (error) {
        if (sequence !== connectSequenceRef.current || !mountedRef.current) return;
        setMicMuted(true);
        setMediaStatus("error");
        setMediaError(
          error instanceof Error
            ? error.message
            : "Не удалось подключить голос. Проверьте сеть или включите совместимый режим.",
        );
      }
    })();

    connectPromiseRef.current = task;
    try {
      await task;
    } finally {
      if (connectPromiseRef.current === task) connectPromiseRef.current = null;
    }
  };

  const enterAndConnect = async () => {
    try {
      if (!inside) {
        const nextRoom = await enter.mutateAsync({ chatId, micMuted });
        utils.chat.room.setData({ chatId }, nextRoom);
      }
      await connectMedia();
    } catch {
      // Ошибка мутации уже отображается ниже.
    }
  };

  const leaveRoom = async () => {
    disconnectMedia();
    await leave.mutateAsync({ chatId });
  };

  const toggleMic = async () => {
    if (mediaActionRef.current) return;
    const liveRoom = liveRoomRef.current;

    if (!liveRoom || mediaStatus !== "connected") {
      setMicMuted((muted) => !muted);
      return;
    }

    mediaActionRef.current = true;
    setMediaActionPending(true);
    setMediaError(null);
    const targetEnabled = getMicrophoneMuted(liveRoom);

    try {
      await liveRoom.localParticipant.setMicrophoneEnabled(
        targetEnabled,
        getAudioCaptureOptions(preferencesRef.current),
        VOICE_PUBLISH_OPTIONS,
      );
      const rnnoiseError = await syncRnnoiseProcessor(liveRoom,
        preferencesRef.current.enhancedNoiseSuppression);
      if (rnnoiseError) setMediaError(rnnoiseError);
      const actualMuted = getMicrophoneMuted(liveRoom);
      setMicMuted(actualMuted);
      if (actualMuted === targetEnabled) {
        throw new Error("Медиасервер не подтвердил изменение микрофона");
      }
      void sendHeartbeat();
      await refreshDevices();
    } catch (error) {
      setMicMuted(getMicrophoneMuted(liveRoom));
      setMediaError(
        error instanceof Error && error.message.includes("timed out")
          ? "Сервер не подтвердил публикацию микрофона. Переподключитесь или включите совместимый режим."
          : error instanceof Error
            ? error.message
            : "Не удалось изменить состояние микрофона.",
      );
    } finally {
      mediaActionRef.current = false;
      setMediaActionPending(false);
    }
  };

  const toggleScreenShare = async () => {
    const liveRoom = liveRoomRef.current;
    if (!liveRoom || mediaStatus !== "connected" || screenSharePending) return;
    setScreenSharePending(true);
    setMediaError(null);
    try {
      await liveRoom.localParticipant.setScreenShareEnabled(
        !screenSharing,
        ECHO_SAFE_SCREEN_SHARE_OPTIONS,
      );
      const publication = liveRoom.localParticipant.getTrackPublication(Track.Source.ScreenShare);
      setScreenSharing(Boolean(publication && !publication.isMuted));
    } catch (error) {
      setMediaError(
        error instanceof Error ? error.message : "Не удалось включить демонстрацию экрана.",
      );
    } finally {
      setScreenSharePending(false);
    }
  };

  const toggleCamera = async () => {
    const liveRoom = liveRoomRef.current;
    if (!liveRoom || mediaStatus !== "connected" || cameraPending) return;
    setCameraPending(true);
    setMediaError(null);
    const enabling = !cameraEnabled;
    try {
      await liveRoom.localParticipant.setCameraEnabled(enabling);
      const publication = liveRoom.localParticipant.getTrackPublication(Track.Source.Camera);
      const enabled = Boolean(publication && !publication.isMuted);
      setCameraEnabled(enabled);
      if (!enabled) clearLocalCamera();
    } catch (error) {
      setCameraEnabled(
        Boolean(
          liveRoom.localParticipant.getTrackPublication(Track.Source.Camera) &&
            !liveRoom.localParticipant.getTrackPublication(Track.Source.Camera)?.isMuted,
        ),
      );
      setMediaError(
        error instanceof Error
          ? error.message
          : "Не удалось включить камеру. Проверьте разрешение браузера.",
      );
    } finally {
      if (!enabling) clearLocalCamera();
      setCameraPending(false);
    }
  };

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true), join: () => void enterAndConnect(),
    toggleMicrophone: () => void toggleMic(), toggleOutput,
    leave: () => { if (inside) void leaveRoom(); },
  }));

  const startMicTest = async () => {
    if (micTestActive) {
      stopMicTest();
      return;
    }

    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getAudioCaptureOptions(preferencesRef.current) as MediaTrackConstraints,
      });
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);

      micTestStreamRef.current = stream;
      micTestContextRef.current = context;
      setMicTestActive(true);
      await refreshDevices(true);

      const measure = () => {
        analyser.getByteFrequencyData(samples);
        const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
        setMicTestLevel(Math.min(100, Math.round(average * 1.6)));
        micTestFrameRef.current = requestAnimationFrame(measure);
      };
      measure();
    } catch {
      stopMicTest();
      setMediaError("Не удалось открыть микрофон. Проверьте разрешение браузера и выбранное устройство.");
    }
  };

  const changeInputDevice = async (deviceId: string) => {
    persistPreferences({ inputDeviceId: deviceId });
    const liveRoom = liveRoomRef.current;
    if (!liveRoom || mediaStatus !== "connected") return;
    try {
      await liveRoom.switchActiveDevice("audioinput", deviceId);
      setMicMuted(getMicrophoneMuted(liveRoom));
    } catch {
      setMediaError("Не удалось переключить микрофон.");
    }
  };

  const changeOutputDevice = async (deviceId: string) => {
    persistPreferences({ outputDeviceId: deviceId });
    const liveRoom = liveRoomRef.current;
    if (!liveRoom || mediaStatus !== "connected") return;
    try {
      await liveRoom.switchActiveDevice("audiooutput", deviceId);
    } catch {
      setMediaError("Этот браузер не поддерживает выбор устройства вывода.");
    }
  };

  const changeAudioProcessing = async (
    key: "echoCancellation" | "noiseSuppression" | "autoGainControl" | "voiceIsolation" | "enhancedNoiseSuppression",
    enabled: boolean,
  ) => {
    const next = persistPreferences(
      key === "enhancedNoiseSuppression"
        ? { enhancedNoiseSuppression: enabled, noiseSuppression: !enabled }
        : { [key]: enabled },
    );
    if (key === "enhancedNoiseSuppression") {
      const liveRoom = liveRoomRef.current;
      if (liveRoom) setMediaError(await syncRnnoiseProcessor(liveRoom, enabled));
    }
    const publication = liveRoomRef.current?.localParticipant.getTrackPublication(
      Track.Source.Microphone,
    );
    if (!(publication?.track instanceof LocalAudioTrack)) return;
    try {
      await publication.track.applyConstraints({
        echoCancellation: next.echoCancellation,
        noiseSuppression: next.noiseSuppression,
        autoGainControl: next.autoGainControl,
        voiceIsolation: next.voiceIsolation,
      });
    } catch {
      setMediaError("Браузер не смог применить эту обработку к активному микрофону.");
    }
  };

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
          onOpen={() => setOpen(true)}
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
                onOpen={() => setOpen(true)}
              />
            ) : undefined
          }
          onOpen={() => setOpen(true)}
          onToggleMic={() => void toggleMic()}
          onToggleOutput={toggleOutput}
          onLeave={() => void leaveRoom()}
        />
      ) : null}

      <VoiceRoomSheet
        open={open}
        onClose={() => {
          stopMicTest();
          parkVisibleMedia();
          setOpen(false);
        }}
        screenContainerRef={bindScreenContainer}
        isDirect={isDirect}
        chatName={chatName}
        active={active}
        durationLabel={durationLabel}
        connectionLabel={connectionLabel}
        mediaStatus={mediaStatus}
        connectionQuality={connectionQuality}
        screenShareOwner={screenShareOwner}
        participants={value?.participants ?? []}
        participantVolumes={participantVolumes}
        micMuted={micMuted}
        outputMuted={outputMuted}
        remoteMicMutedById={remoteMicMutedById}
        activeSpeakerIds={activeSpeakerIds}
        mediaActionPending={mediaActionPending}
        screenSharePending={screenSharePending}
        screenSharing={screenSharing}
        cameraParticipantIds={cameraParticipantIds}
        cameraEnabled={cameraEnabled}
        cameraPending={cameraPending}
        audioBlocked={audioBlocked}
        onMicToggle={toggleMic}
        onOutputToggle={toggleOutput}
        onScreenShareToggle={toggleScreenShare}
        onCameraToggle={toggleCamera}
        onResumeAudio={resumeAudio}
        onCameraContainerChange={bindCameraContainer}
        onParticipantVolumeChange={setParticipantVolume}
        settingsPanel={
          <VoiceSettingsPanel
            preferences={preferences}
            inputDevices={inputDevices}
            outputDevices={outputDevices}
            micTestActive={micTestActive}
            micTestLevel={micTestLevel}
            endpoints={endpoints}
            selectedEndpoint={selectedEndpoint}
            currentEndpoint={currentEndpoint}
            mediaStatus={mediaStatus}
            onInputDeviceChange={changeInputDevice}
            onOutputDeviceChange={changeOutputDevice}
            onMicTestToggle={startMicTest}
            onRefreshDevices={() => refreshDevices(true)}
            onAudioProcessingChange={changeAudioProcessing}
            onEndpointChange={(endpointUrl) => persistPreferences({ endpointUrl })}
            onCompatibilityModeChange={(compatibilityMode) =>
              persistPreferences({ compatibilityMode })
            }
            onRoomSoundsChange={(roomSounds) => persistPreferences({ roomSounds })}
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
    </>
  );
});

export type { VoiceControlState } from "./voice/voice-room-config";
