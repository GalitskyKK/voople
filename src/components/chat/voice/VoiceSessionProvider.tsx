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
import type {
  ChatRoomControlHandle,
  VoiceControlState,
} from "../ChatRoomControl";
import { cn } from "@/lib/utils";
import { IncomingCallOverlay } from "./IncomingCallOverlay";
import {
  useIncomingVoiceCalls,
  type SubscribeToVoiceRooms,
} from "./useIncomingVoiceCalls";

const ChatRoomControl = lazy(() =>
  import("../ChatRoomControl").then((module) => ({
    default: module.ChatRoomControl,
  })),
);

export type VoiceSessionDescriptor = {
  chatId: string;
  chatName: string;
  chatType: "direct" | "group";
};

type VoiceSessionContextValue = {
  activeSession: VoiceSessionDescriptor | null;
  state: VoiceControlState;
  openRoom: (session: VoiceSessionDescriptor) => void;
  openPanel: () => void;
  toggleMicrophone: () => void;
  toggleOutput: () => void;
  leaveRoom: () => void;
};

const IDLE_STATE: VoiceControlState = {
  inside: false,
  mediaStatus: "idle",
  participantCount: 0,
  micMuted: true,
  outputMuted: false,
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
  const [state, setState] = useState<VoiceControlState>(IDLE_STATE);
  const controlRef = useRef<ChatRoomControlHandle>(null);
  const autoConnectPendingRef = useRef(false);
  const handleControlRef = useCallback((control: ChatRoomControlHandle | null) => {
    controlRef.current = control;
    if (!control || !autoConnectPendingRef.current) return;
    autoConnectPendingRef.current = false;
    control.join();
  }, []);

  const openRoom = useCallback(
    (session: VoiceSessionDescriptor) => {
      autoConnectPendingRef.current = false;
      if (state.inside && activeSession && activeSession.chatId !== session.chatId) {
        controlRef.current?.open();
        return;
      }
      if (activeSession?.chatId !== session.chatId) {
        setState(IDLE_STATE);
        setActiveSession(session);
      } else {
        setActiveSession(session);
        controlRef.current?.open();
      }
    },
    [activeSession, state.inside],
  );

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

  const value = useMemo(
    () => ({
      activeSession,
      state,
      openRoom,
      openPanel: () => controlRef.current?.open(),
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
    [activeSession, openRoom, state],
  );
  const incoming = useIncomingVoiceCalls({
    busy: state.inside,
    onIncomingCall,
    subscribeToVoiceRooms,
    onAnswer: (call) => {
      const existingControl =
        activeSession?.chatId === call.chatId ? controlRef.current : null;
      autoConnectPendingRef.current = !existingControl;
      setState(IDLE_STATE);
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
              key={activeSession.chatId}
              ref={handleControlRef}
              {...activeSession}
              renderTrigger={false}
              initialOpen
              onStateChange={handleStateChange}
            />
          </Suspense>
        ) : null}
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
