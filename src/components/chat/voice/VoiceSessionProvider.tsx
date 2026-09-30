"use client";

import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { IncomingCallView } from "@/types/chat";
import { ChatComposerSessionProvider } from "@/components/chat/ChatComposerSessionProvider";
import { GroupNowRoomSwitchDialog } from "@/components/chat/GroupNowRoomSwitchDialog";
import { useGroupNowRoomJoin } from "@/hooks/useGroupNowRoomJoin";
import type { GroupNowRoomTarget } from "@/types/group-now";
import type { GroupRoomJoinResult } from "@/types/group-room-mutations";
import type { CoreVoiceSessionDescriptor, CoreVoiceSessionLaunch, EnabledVoiceMediaCredentials } from "@/types/voice";
import type { ChatRoomControlHandle, VoiceControlState } from "../ChatRoomControl";
import { cn } from "@/lib/utils";
import { useAppPreferences } from "@/components/settings/AppPreferencesProvider";
import { preloadProductSounds } from "@/lib/sound/sound-playback";
import { trpc } from "@/lib/trpc/client";
import { IncomingCallOverlay } from "./IncomingCallOverlay";
import { LiveMoveHandoffBridge } from "./LiveMoveHandoffBridge";
import { useIncomingVoiceCalls, type SubscribeToVoiceRooms } from "./useIncomingVoiceCalls";
import { resolveVoiceConversationId } from "./voice-conversation-context";
import { IDLE_VOICE_CONTROL_STATE } from "./voice-session-state";
import { useVoiceParticipantSnapshot } from "./useVoiceParticipantSnapshot";
import type { CoreDirectCallTarget } from "./useCoreDirectCallServerAdapter";
const ChatRoomControl = lazy(() =>
  import("../ChatRoomControl").then((module) => ({
    default: module.ChatRoomControl,
  })),
);

import type { VoiceSessionParticipants } from "@/types/voice-session-participants";

export type VoiceSessionDescriptor = {
  chatId: string;
  chatName: string;
  chatType: "direct" | "group";
  expectedStartedAt?: string;
  coreSession?: CoreVoiceSessionDescriptor;
  coreDirectCall?: CoreDirectCallTarget;
};

export type VoiceSessionContextValue = {
  activeSession: VoiceSessionDescriptor | null;
  state: VoiceControlState;
  participantDetails: VoiceSessionParticipants | null;
  openRoom: (session: VoiceSessionDescriptor) => void;
  joinRoom: (session: VoiceSessionDescriptor) => boolean;
  openCoreRoom: (launch: CoreVoiceSessionLaunch) => void;
  openPanel: () => void;
  minimizePanel: (showDock?: boolean) => void;
  toggleMicrophone: () => void;
  toggleOutput: () => void;
  leaveRoom: () => Promise<void>;
};

const VoiceSessionContext = createContext<VoiceSessionContextValue | null>(null);
export function VoiceSessionProvider({
  children,
  onIncomingCall,
  subscribeToVoiceRooms,
  allowCustomIncomingSound = true,
}: {
  children: React.ReactNode;
  onIncomingCall?: (call: IncomingCallView) => void;
  subscribeToVoiceRooms?: SubscribeToVoiceRooms;
  allowCustomIncomingSound?: boolean;
}) {
  const { preferences } = useAppPreferences();
  const coreCapability = trpc.chat.coreDirectCallCapability.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const coreEnabled = coreCapability.data?.enabled === true;
  const coreStartEnabled = coreCapability.data?.startEnabled === true;
  const activeCoreCall = trpc.chat.coreMyDirectCall.useQuery(undefined, {
    enabled: coreEnabled, retry: false, refetchInterval: coreEnabled ? 15_000 : false,
  });
  useEffect(() => {
    const timer = window.setTimeout(() => { void preloadProductSounds(preferences.soundPack); }, 0);
    return () => window.clearTimeout(timer);
  }, [preferences.soundPack]);
  const [activeSession, setActiveSession] = useState<VoiceSessionDescriptor | null>(null);
  const activeSessionRef = useRef(activeSession);
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);
  const [state, setState] = useState<VoiceControlState>(IDLE_VOICE_CONTROL_STATE);
  const { participantDetails, handleParticipantsChange } = useVoiceParticipantSnapshot();
  const controlRef = useRef<ChatRoomControlHandle>(null);
  const autoConnectPendingRef = useRef(false);
  useEffect(() => {
    const call = activeCoreCall.data;
    if (!coreEnabled || !call || activeSession) return;
    if (call.status === "ringing" && !call.isCaller) return;
    const timer = window.setTimeout(() => {
      autoConnectPendingRef.current = true;
      setState(IDLE_VOICE_CONTROL_STATE);
      setActiveSession({
        chatId: call.conversation_id, chatName: "Личный звонок", chatType: "direct",
        coreDirectCall: { requestId: crypto.randomUUID(), sessionId: call.id },
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeCoreCall.data, activeSession, coreEnabled]);
  const [initialCoreCredentials, setInitialCoreCredentials] = useState<EnabledVoiceMediaCredentials | null>(null);
  const handleControlRef = useCallback((control: ChatRoomControlHandle | null) => {
    controlRef.current = control;
    if (!control || !autoConnectPendingRef.current) return;

    // A keyed controller can be replaced once while the lazy boundary settles.
    // Start against the latest mounted handle and consume the pending join once.
    window.setTimeout(() => {
      const latestControl = controlRef.current;
      if (!latestControl || !autoConnectPendingRef.current) return;
      autoConnectPendingRef.current = false;
      latestControl.join();
      setInitialCoreCredentials(null);
    }, 0);
  }, []);

  const openRoom = useCallback(
    (session: VoiceSessionDescriptor) => {
      const target = session.chatType === "direct" && coreStartEnabled && !session.expectedStartedAt
        ? { ...session, coreDirectCall: activeSession?.chatId === session.chatId
          ? activeSession.coreDirectCall ?? { requestId: crypto.randomUUID() }
          : { requestId: crypto.randomUUID() } }
        : session;
      autoConnectPendingRef.current = false;
      setInitialCoreCredentials(null);
      if (state.inside && (activeSession?.coreSession || activeSession?.coreDirectCall)) {
        controlRef.current?.open();
        return;
      }
      if (state.inside && activeSession && activeSession.chatId !== target.chatId) {
        controlRef.current?.open();
        return;
      }
      if (activeSession?.chatId !== target.chatId) {
        setState(IDLE_VOICE_CONTROL_STATE);
        setActiveSession(target);
      } else {
        setActiveSession(target);
        controlRef.current?.open();
      }
    },
    [activeSession, coreStartEnabled, state.inside],
  );

  const openCoreRoom = useCallback(
    (launch: CoreVoiceSessionLaunch) => {
      autoConnectPendingRef.current = true;
      setInitialCoreCredentials(launch.credentials);
      setState(IDLE_VOICE_CONTROL_STATE);

      setActiveSession({
        chatId: launch.groupId,
        chatName: launch.room.name,
        chatType: "group",
        coreSession: {
          groupId: launch.groupId,
          conversationId:
            launch.conversationId ?? launch.groupId,
          room: launch.room,
          join: launch.join,
        },
      });
    },
    [],
  );
  const handleCoreRoomJoined = useCallback((
    target: GroupNowRoomTarget,
    join: GroupRoomJoinResult,
    credentials: EnabledVoiceMediaCredentials,
  ) => {
    const conversationId = resolveVoiceConversationId(activeSession?.coreSession, target.groupId);
    openCoreRoom({ groupId: target.groupId, conversationId, room: target.room, join, credentials });
  }, [activeSession, openCoreRoom]);
  const roomSwitch = useGroupNowRoomJoin({
    onJoined: handleCoreRoomJoined,
  });

  const joinRoom = useCallback((session: VoiceSessionDescriptor) => {
    const target = session.chatType === "direct" && coreStartEnabled && !session.expectedStartedAt
      ? { ...session, coreDirectCall: activeSession?.chatId === session.chatId
        ? activeSession.coreDirectCall ?? { requestId: crypto.randomUUID() }
        : { requestId: crypto.randomUUID() } }
      : session;
    if (state.inside) {
      controlRef.current?.open();
      return activeSession?.chatId === target.chatId;
    }
    const existingControl = activeSession?.chatId === target.chatId
      ? controlRef.current
      : null;
    setInitialCoreCredentials(null);
    autoConnectPendingRef.current = !existingControl;
    if (!existingControl) setState(IDLE_VOICE_CONTROL_STATE);
    setActiveSession(target);
    existingControl?.join();
    return true;
  }, [activeSession, coreStartEnabled, state.inside]);

  const handleStateChange = useCallback((next: VoiceControlState) => {
    setState((current) =>
      current.inside === next.inside &&
      current.mediaStatus === next.mediaStatus &&
      current.participantCount === next.participantCount &&
      current.micMuted === next.micMuted &&
      current.outputMuted === next.outputMuted
        ? current
        : next,
    );
  }, []);
  const handleLeaveConfirmed = useCallback((chatId: string, sessionId: string | null) => {
    const current = activeSessionRef.current;
    if (current?.chatId !== chatId || (current.coreSession?.join.sessionId ?? current.coreDirectCall?.sessionId ?? null) !== sessionId) return;
    activeSessionRef.current = null;
    autoConnectPendingRef.current = false;
    setInitialCoreCredentials(null);
    setState(IDLE_VOICE_CONTROL_STATE);
    setActiveSession(null);
  }, []);
  const minimizePanel = useCallback((showDock?: boolean) => controlRef.current?.minimize(showDock), []);

  const value = useMemo(
    () => ({
      activeSession,
      state,
      participantDetails: state.inside && participantDetails?.sessionId === activeSession?.coreSession?.join.sessionId ? participantDetails : null,
      openRoom,
      joinRoom,
      openCoreRoom,
      openPanel: () => controlRef.current?.open(),
      minimizePanel,
      toggleMicrophone: () => {
        if (state.inside) controlRef.current?.toggleMicrophone();
      },
      toggleOutput: () => {
        if (state.inside) controlRef.current?.toggleOutput();
      },
      leaveRoom: async () => {
        if (state.inside) await controlRef.current?.leave();
      },
    }),
    [activeSession, joinRoom, minimizePanel, openCoreRoom, openRoom, state, participantDetails],
  );
  const incoming = useIncomingVoiceCalls({
    busy: state.inside,
    coreEnabled,
    onIncomingCall,
    subscribeToVoiceRooms,
    onAnswer: (call) => {
      autoConnectPendingRef.current = true;
      setInitialCoreCredentials(null);
      setState(IDLE_VOICE_CONTROL_STATE);
      setActiveSession({
        chatId: call.chatId,
        chatName: call.chatName,
        chatType: call.chatType,
        expectedStartedAt: call.startedAt,
        coreDirectCall: call.coreSessionId
          ? { sessionId: call.coreSessionId, requestId: crypto.randomUUID() }
          : undefined,
      });
    },
  });

  return (
    <VoiceSessionContext.Provider value={value}>
      <ChatComposerSessionProvider>
        <div
          className={cn(
            "contents",
            state.inside && "voople-voice-session voople-voice-session--active",
          )}
        >
          {children}
          <LiveMoveHandoffBridge />
          {activeSession ? (
            <Suspense fallback={null}>
              <ChatRoomControl
                key={`${activeSession.chatId}:${activeSession.coreSession?.join.sessionId ?? activeSession.coreDirectCall?.sessionId ?? activeSession.expectedStartedAt ?? "legacy"}`}
                ref={handleControlRef}
                {...activeSession}
                initialCoreCredentials={initialCoreCredentials ?? undefined}
                onCoreRoomSwitch={roomSwitch.requestJoin}
                renderTrigger={false}
                onStateChange={handleStateChange}
                onParticipantsChange={handleParticipantsChange}
                onLeaveConfirmed={handleLeaveConfirmed}
              />
            </Suspense>
          ) : null}
          <GroupNowRoomSwitchDialog
            room={roomSwitch.confirmationTarget?.room ?? null}
            pending={roomSwitch.pending}
            error={roomSwitch.confirmationError}
            onCancel={roomSwitch.cancelSwitch}
            onConfirm={() => void roomSwitch.confirmSwitch()}
          />
          <IncomingCallOverlay
            call={incoming.call}
            allowCustomSound={allowCustomIncomingSound}
            declinePending={incoming.declinePending}
            onAnswer={incoming.answer}
            onDecline={() => void incoming.decline()}
          />
        </div>
      </ChatComposerSessionProvider>
    </VoiceSessionContext.Provider>
  );
}

export function useVoiceSession() {
  const value = useContext(VoiceSessionContext);
  if (!value) {
    throw new Error("useVoiceSession must be used inside VoiceSessionProvider");
  }
  return value;
}

export function useOptionalVoiceSession() {
  return useContext(VoiceSessionContext);
}
