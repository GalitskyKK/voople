"use client";

import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import type { IncomingCallView } from "@/types/chat";
import { GroupNowRoomSwitchDialog } from "@/components/chat/GroupNowRoomSwitchDialog";
import { useGroupNowRoomJoin } from "@/hooks/useGroupNowRoomJoin";
import type { GroupNowRoomTarget } from "@/types/group-now";
import type { GroupRoomJoinResult } from "@/types/group-room-mutations";
import type { CoreVoiceSessionDescriptor, CoreVoiceSessionLaunch, EnabledVoiceMediaCredentials } from "@/types/voice";
import type { ChatRoomControlHandle, VoiceControlState } from "../ChatRoomControl";
import { cn } from "@/lib/utils";
import { IncomingCallOverlay } from "./IncomingCallOverlay";
import { useIncomingVoiceCalls, type SubscribeToVoiceRooms } from "./useIncomingVoiceCalls";
import { resolveVoiceConversationId } from "./voice-conversation-context";
import { IDLE_VOICE_CONTROL_STATE } from "./voice-session-state";

const ChatRoomControl = lazy(() =>
  import("../ChatRoomControl").then((module) => ({
    default: module.ChatRoomControl,
  })),
);

export type VoiceSessionDescriptor = {
  chatId: string;
  chatName: string;
  chatType: "direct" | "group";
  coreSession?: CoreVoiceSessionDescriptor;
};

export type VoiceSessionContextValue = {
  activeSession: VoiceSessionDescriptor | null;
  state: VoiceControlState;
  openRoom: (session: VoiceSessionDescriptor) => void;
  joinRoom: (session: VoiceSessionDescriptor) => boolean;
  openCoreRoom: (launch: CoreVoiceSessionLaunch) => void;
  openPanel: () => void;
  minimizePanel: () => void;
  toggleMicrophone: () => void;
  toggleOutput: () => void;
  leaveRoom: () => void;
};

const VoiceSessionContext = createContext<VoiceSessionContextValue | null>(null);

export function VoiceSessionProvider({
  children,
  onIncomingCall,
  subscribeToVoiceRooms,
}: {
  children: React.ReactNode;
  onIncomingCall?: (call: IncomingCallView) => void;
  subscribeToVoiceRooms?: SubscribeToVoiceRooms;
}) {
  const [activeSession, setActiveSession] = useState<VoiceSessionDescriptor | null>(null);
  const [state, setState] = useState<VoiceControlState>(IDLE_VOICE_CONTROL_STATE);
  const controlRef = useRef<ChatRoomControlHandle>(null);
  const autoConnectPendingRef = useRef(false);
  const [initialCoreCredentials, setInitialCoreCredentials] = useState<EnabledVoiceMediaCredentials | null>(null);
  const handleControlRef = useCallback((control: ChatRoomControlHandle | null) => {
    controlRef.current = control;
    if (!control || !autoConnectPendingRef.current) return;
    setInitialCoreCredentials(null);
    autoConnectPendingRef.current = false;
    control.join();
  }, []);

  const openRoom = useCallback(
    (session: VoiceSessionDescriptor) => {
      autoConnectPendingRef.current = false;
      setInitialCoreCredentials(null);
      if (state.inside && activeSession?.coreSession) {
        controlRef.current?.open();
        return;
      }
      if (state.inside && activeSession && activeSession.chatId !== session.chatId) {
        controlRef.current?.open();
        return;
      }
      if (activeSession?.chatId !== session.chatId) {
        setState(IDLE_VOICE_CONTROL_STATE);
        setActiveSession(session);
      } else {
        setActiveSession(session);
        controlRef.current?.open();
      }
    },
    [activeSession, state.inside],
  );

  const openCoreRoom = useCallback((launch: CoreVoiceSessionLaunch) => {
    setInitialCoreCredentials(launch.credentials);
    autoConnectPendingRef.current = true;
    setState(IDLE_VOICE_CONTROL_STATE);
    setActiveSession({
      chatId: launch.groupId,
      chatName: launch.room.name,
      chatType: "group",
      coreSession: {
        groupId: launch.groupId,
        conversationId: launch.conversationId ?? launch.groupId,
        room: launch.room,
        join: launch.join,
      },
    });
  }, []);
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
    if (state.inside) {
      controlRef.current?.open();
      return activeSession?.chatId === session.chatId;
    }
    const existingControl = activeSession?.chatId === session.chatId
      ? controlRef.current
      : null;
    setInitialCoreCredentials(null);
    autoConnectPendingRef.current = !existingControl;
    if (!existingControl) setState(IDLE_VOICE_CONTROL_STATE);
    setActiveSession(session);
    existingControl?.join();
    return true;
  }, [activeSession?.chatId, state.inside]);

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
  const minimizePanel = useCallback(() => controlRef.current?.minimize(), []);

  const value = useMemo(
    () => ({
      activeSession,
      state,
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
      leaveRoom: () => {
        if (state.inside) controlRef.current?.leave();
      },
    }),
    [activeSession, joinRoom, minimizePanel, openCoreRoom, openRoom, state],
  );
  const incoming = useIncomingVoiceCalls({
    busy: state.inside,
    onIncomingCall,
    subscribeToVoiceRooms,
    onAnswer: (call) => {
      const existingControl =
        activeSession?.chatId === call.chatId ? controlRef.current : null;
      autoConnectPendingRef.current = !existingControl;
      setInitialCoreCredentials(null);
      setState(IDLE_VOICE_CONTROL_STATE);
      setActiveSession({
        chatId: call.chatId,
        chatName: call.chatName,
        chatType: call.chatType,
      });
      existingControl?.join();
    },
  });

  return (
    <VoiceSessionContext.Provider value={value}>
      <div
        className={cn(
          "contents",
          state.inside && "voople-voice-session voople-voice-session--active",
        )}
      >
        {children}
        {activeSession ? (
          <Suspense fallback={null}>
            <ChatRoomControl
              key={`${activeSession.chatId}:${activeSession.coreSession?.join.sessionId ?? "legacy"}`}
              ref={handleControlRef}
              {...activeSession}
              initialCoreCredentials={initialCoreCredentials ?? undefined}
              onCoreRoomSwitch={roomSwitch.requestJoin}
              renderTrigger={false}
              initialOpen
              onStateChange={handleStateChange}
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
          declinePending={incoming.declinePending}
          onAnswer={incoming.answer}
          onDecline={() => void incoming.decline()}
        />
      </div>
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
