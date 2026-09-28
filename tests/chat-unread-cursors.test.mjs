import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("unread cursors are per user, monotonic and private", () => {
  const migration = source("drizzle/65-chat-read-cursors.sql");

  assert.match(migration, /PRIMARY KEY \(chat_id, user_id\)/);
  assert.match(migration, /message\.sender_id <> p_user_id/);
  assert.match(migration, /COALESCE\(cursor\.read_through_at, root_member\.joined_at\)/);
  assert.match(migration, /GREATEST\(chat_read_cursors\.read_through_at, EXCLUDED\.read_through_at\)/);
  assert.match(migration, /LEAST\(p_read_through_at, now\(\)\)/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.chat_read_cursors FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.list_chat_unread_counts\(uuid\) TO service_role/);
});

test("chat list aggregates section unread counts without mixing them with live state", () => {
  const data = source("src/server/data/chat-rest.ts");
  const view = source("src/components/layout/MessengerSidebarRows.tsx");
  const listRow = source("src/components/chat/ChatListRow.tsx");
  const badge = source("src/components/chat/ChatUnreadBadge.tsx");

  assert.match(data, /loadChatUnreadCountsRest\(userId\)/);
  assert.match(data, /unreadCount: unreadByChat\.get\(id\) \?\? 0/);
  assert.match(data, /item\.channels\.reduce\(\(total, channel\) => total \+ channel\.unreadCount, 0\)/);
  assert.match(view, /<ChatUnreadBadge count=\{chat\.unreadCount\}/);
  assert.match(listRow, /<ChatUnreadBadge count=\{chat\.unreadCount\}/);
  assert.match(badge, /Непрочитанных сообщений/);
  assert.match(view, /live\.participantCount/);
});

test("Home attention uses the same per-member cursor as the messenger sidebar", () => {
  const data = source("src/server/data/home-overview-rest.ts");
  const service = source("src/server/services/home.service.ts");

  assert.match(data, /from\("chat_read_cursors"\)/);
  assert.match(data, /readThroughByChat\.get\(chatId\) \?\? joinedAtByRoot\.get\(rootChatId\)/);
  assert.doesNotMatch(data, /is\("read_at", null\)/);
  assert.match(service, /const unreadCount = chat\.unreadCount/);
  assert.match(service, /\.\.\.chat\.channels\.map/);
});

test("migration 65 is part of the release ledger", () => {
  const manifest = source("scripts/migration-manifest.mjs");
  const occurrences = manifest.match(/65-chat-read-cursors\.sql/g) ?? [];
  assert.equal(occurrences.length, 2);
});
