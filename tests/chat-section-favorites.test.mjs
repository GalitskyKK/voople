import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("section favorites are per-user, bounded per Group and access checked in Postgres", () => {
  const migration = read("drizzle/69-chat-section-favorites.sql");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.user_chat_section_favorites/);
  assert.match(migration, /UNIQUE \(user_id, group_id, position\)/);
  assert.match(migration, /position BETWEEN 1 AND 2/);
  assert.match(migration, /FOREIGN KEY \(group_id, user_id\)/);
  assert.match(migration, /JOIN public\.chat_members AS member/);
  assert.match(migration, /section\.section_access_mode/);
  assert.match(migration, /public\.chat_section_members/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /DELETE FROM public\.user_chat_section_favorites AS favorite/);
  assert.match(migration, /CHAT_SECTION_FAVORITE_LIMIT/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.user_chat_section_favorites FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /contains no message content or credentials/);
});

test("chat list returns favorite positions and mutation stays server-authorized", () => {
  const list = read("src/server/data/chat-rest.ts");
  const data = read("src/server/data/chat-section-favorites-rest.ts");
  const schema = read("src/server/db/chat-section-favorites-schema.ts");
  const router = read("src/server/trpc/routers/chat.ts");
  const types = read("src/types/chat.ts");
  const accountExport = read("src/server/data/account-export-rest.ts");
  const manifest = read("scripts/migration-manifest.mjs");

  assert.match(list, /from\("user_chat_section_favorites"\)/);
  assert.match(list, /\.eq\("user_id", userId\)/);
  assert.match(list, /favoritePosition: favoritePositionBySection\.get\(id\) \?\? null/);
  assert.match(data, /rpc\("toggle_chat_section_favorite"/);
  assert.match(schema, /user_chat_section_favorites/);
  assert.match(schema, /groupMembershipFk: foreignKey/);
  assert.match(router, /toggleSectionFavorite: protectedProcedure/);
  assert.match(router, /rateLimits\.updateChatPreference/);
  assert.match(types, /favoritePosition\?: 1 \| 2 \| null/);
  assert.match(accountExport, /sectionFavorites/);
  assert.equal((manifest.match(/69-chat-section-favorites\.sql/g) ?? []).length, 2);
});

test("picker exposes two stable shortcuts and a separate keyboard-accessible star action", () => {
  const picker = read("src/components/chat/ChatSectionPicker.tsx");
  const option = read("src/components/chat/ChatSectionPickerOption.tsx");
  const web = read("src/components/chat/ChatSectionsBar.tsx");
  const desktop = read("desktop/src/adapters/DesktopChatThreadAdapter.tsx");

  assert.match(picker, /section\.favoritePosition/);
  assert.match(option, /aria-pressed=\{favorite\}/);
  assert.match(option, /Убрать \$\{label\} из избранных/);
  assert.match(option, /Закрепить \$\{label\}/);
  assert.match(picker, /section\.id !== activeSection\.id/);
  assert.match(picker, /sm:inline-flex/);
  assert.match(web, /toggleSectionFavorite\.useMutation/);
  assert.match(web, /utils\.chat\.list\.invalidate/);
  assert.match(desktop, /client\.mutation\("chat\.toggleSectionFavorite"/);
  assert.match(web, /favoriteError/);
  assert.match(desktop, /favoriteError/);
});
