"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import type { PendingChatUpload } from "@/hooks/useChatUpload";
import type { ChatMessageView } from "@/types/chat";
import type { PlaylistTrackView } from "@/types/playlist";

export type ChatComposerSessionState = {
  text: string;
  replyTo: ChatMessageView | null;
  editing: ChatMessageView | null;
  pendingUpload: PendingChatUpload | null;
  pendingTrack: PlaylistTrackView | null;
};

const EMPTY_SESSION: ChatComposerSessionState = {
  text: "",
  replyTo: null,
  editing: null,
  pendingUpload: null,
  pendingTrack: null,
};

type ComposerSessionStore = {
  sessions: Readonly<Record<string, ChatComposerSessionState>>;
  update: (
    chatId: string,
    recipe: (current: ChatComposerSessionState) => ChatComposerSessionState,
  ) => void;
};

const ChatComposerSessionContext = createContext<ComposerSessionStore | null>(null);

function resolveAction<T>(action: SetStateAction<T>, current: T) {
  return typeof action === "function"
    ? (action as (value: T) => T)(current)
    : action;
}

export function ChatComposerSessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Record<string, ChatComposerSessionState>>({});
  const sessionsRef = useRef(sessions);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const update = useCallback<ComposerSessionStore["update"]>((chatId, recipe) => {
    setSessions((current) => {
      const previous = current[chatId] ?? EMPTY_SESSION;
      const next = recipe(previous);
      return Object.is(previous, next) ? current : { ...current, [chatId]: next };
    });
  }, []);

  useEffect(() => () => {
    for (const session of Object.values(sessionsRef.current)) {
      if (session.pendingUpload?.previewUrl) {
        URL.revokeObjectURL(session.pendingUpload.previewUrl);
      }
    }
  }, []);

  const value = useMemo(() => ({ sessions, update }), [sessions, update]);
  return (
    <ChatComposerSessionContext.Provider value={value}>
      {children}
    </ChatComposerSessionContext.Provider>
  );
}

export function useChatComposerSession(chatId: string) {
  const store = useContext(ChatComposerSessionContext);
  if (!store) {
    throw new Error("useChatComposerSession must be used inside ChatComposerSessionProvider");
  }
  const state = store.sessions[chatId] ?? EMPTY_SESSION;
  const update = store.update;
  const setField = useCallback(<K extends keyof ChatComposerSessionState>(
    key: K,
    action: SetStateAction<ChatComposerSessionState[K]>,
  ) => {
    update(chatId, (current) => ({
      ...current,
      [key]: resolveAction(action, current[key]),
    }));
  }, [chatId, update]);

  const setters = useMemo(() => ({
    setText: ((value) => setField("text", value)) as Dispatch<SetStateAction<string>>,
    setReplyTo: ((value) => setField("replyTo", value)) as Dispatch<SetStateAction<ChatMessageView | null>>,
    setEditing: ((value) => setField("editing", value)) as Dispatch<SetStateAction<ChatMessageView | null>>,
    setPendingUpload: ((value) => setField("pendingUpload", value)) as Dispatch<SetStateAction<PendingChatUpload | null>>,
    setPendingTrack: ((value) => setField("pendingTrack", value)) as Dispatch<SetStateAction<PlaylistTrackView | null>>,
  }), [setField]);
  const discardPendingUpload = useCallback(() => {
    setField("pendingUpload", (current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  }, [setField]);

  return { ...state, ...setters, discardPendingUpload };
}
