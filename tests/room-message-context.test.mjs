import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { messageRoomContextKey } from "../src/lib/chat/message-room-context.ts";

const read = (path) => readFileSync(path, "utf8");

test("Room context is hydrated as a compatibility-safe immutable snapshot", () => {
  const hydration = read("src/server/data/chat-message-hydration-rest.ts");
  assert.match(hydration, /\.from\("message_room_contexts"\)/);
  assert.match(hydration, /error\?\.code === "42P01"/);
  assert.match(hydration, /error\?\.code === "PGRST205"/);
  assert.match(hydration, /roomContext: roomContextsById\.get\(row\.id\) \?\? null/);
});

test("Room context is attached atomically from the sender active same-Group session", () => {
  const migration = read("drizzle/66-room-message-context.sql");
  const manifest = read("scripts/migration-manifest.mjs");
  assert.match(migration, /AFTER INSERT ON public\.messages/);
  assert.match(migration, /participant\.user_id = NEW\.sender_id/);
  assert.match(migration, /participant\.left_at IS NULL/);
  assert.match(migration, /session\.ended_at IS NULL/);
  assert.match(migration, /room\.group_chat_id = v_root_chat_id/);
  assert.match(migration, /COALESCE\(chat\.parent_chat_id, chat\.id\)/);
  assert.match(migration, /ON CONFLICT \(message_id\) DO NOTHING/);
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(manifest, /"66-room-message-context\.sql"/);
});

test("Room context uses one quiet shared marker in the existing message bubble", () => {
  const bubble = read("src/components/chat/ChatMessageBubbleVisual.tsx");
  const marker = read("src/components/chat/ChatMessageRoomContext.tsx");
  assert.match(bubble, /<ChatMessageRoomContext context=\{message\.roomContext\} \/>/);
  assert.match(bubble, /groupPosition === "only" \|\| groupPosition === "start"/);
  assert.match(marker, /Из комнаты \{context\.roomName\}/);
  assert.doesNotMatch(marker, /rounded|border|shadow|bg-\[/);
});

test("messages from different Room sessions never merge into one visual group", () => {
  const lobby = {
    roomId: "10000000-0000-4000-8000-000000000001",
    liveSessionId: "20000000-0000-4000-8000-000000000001",
    roomName: "Лобби",
    roomKind: "lobby",
    capturedAt: "2026-09-08T12:00:00.000Z",
  };
  const drg = {
    ...lobby,
    roomId: "10000000-0000-4000-8000-000000000002",
    liveSessionId: "20000000-0000-4000-8000-000000000002",
    roomName: "DRG",
    roomKind: "temporary",
  };
  assert.equal(messageRoomContextKey(lobby), messageRoomContextKey({ ...lobby }));
  assert.notEqual(messageRoomContextKey(lobby), messageRoomContextKey(drg));
  assert.notEqual(messageRoomContextKey(lobby), messageRoomContextKey(null));

  const grouping = read("src/lib/chat/group-messages.ts");
  assert.match(grouping, /messageRoomContextKey\(first\.roomContext\)/);
  assert.match(grouping, /messageRoomContextKey\(second\.roomContext\)/);
});

test("the Room surface opens the ordinary selected Group or Section conversation", () => {
  const panel = read("src/components/chat/voice/RoomMessagesPanel.tsx");
  const surface = read("src/components/chat/voice/VoiceRoomMainSurface.tsx");
  const header = read("src/components/chat/voice/VoiceRoomHeader.tsx");
  const control = read("src/components/chat/voice/useChatRoomControl.ts");
  const launcher = read("src/hooks/useGroupNowVoiceLauncher.ts");
  const provider = read("src/components/chat/voice/VoiceSessionProvider.tsx");
  const context = read("src/components/chat/voice/voice-conversation-context.ts");

  assert.match(panel, /trpc\.chat\.observeMessages\.useQuery/);
  assert.doesNotMatch(panel, /\.filter\([\s\S]{0,160}liveSessionId/);
  assert.match(panel, /buildChatTimeline\(conversationMessages\)/);
  assert.match(panel, /<ChatMessageBubble/);
  assert.match(panel, /<ChatComposer/);
  assert.doesNotMatch(panel, /markRead/);
  assert.match(surface, /secondaryPanel === "messages"/);
  assert.match(surface, /<RoomMessagesPanel model=\{messages\}/);
  assert.match(header, /Открыть чат группы/);
  assert.match(control, /buildVoiceRoomMessagesModel\(coreSession, inside\)/);
  assert.match(launcher, /conversationId: conversationId \?\? groupId/);
  assert.match(provider, /conversationId: launch\.conversationId \?\? launch\.groupId/);
  assert.match(provider, /resolveVoiceConversationId\(activeSession\?\.coreSession, target\.groupId\)/);
  assert.match(context, /current\.conversationId \?\? targetGroupId/);
  assert.match(context, /chatId: session\.conversationId \?\? session\.groupId/);
  assert.match(context, /liveSessionId: session\.join\.sessionId/);
});
