import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("profile group tag migration is server-owned and release-gated", () => {
  const migration = read("drizzle/56-user-group-profile-tag.sql");
  const manifest = read("scripts/migration-manifest.mjs");

  assert.match(migration, /user_id uuid PRIMARY KEY/);
  assert.match(migration, /chat_id uuid NOT NULL REFERENCES public\.chats\(id\) ON DELETE CASCADE/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL .* anon, authenticated/);
  assert.match(manifest, /56-user-group-profile-tag\.sql/);
});

test("profile tag selection checks group membership and stays platform-shared", () => {
  const data = read("src/server/data/chat-community-rest.ts");
  const view = read("src/components/chat/GroupInfoDrawerView.tsx");
  const web = read("src/components/chat/GroupInfoDrawer.tsx");
  const desktop = read("desktop/src/chat/DesktopChatThread.tsx");
  const profile = read("src/components/profile/ProfileCardIdentityVisual.tsx");

  assert.match(data, /getGroupCommunityRest\(chatId, userId\)/);
  assert.match(data, /user_group_profile_tags/);
  assert.match(view, /Использовать тег/);
  assert.match(web, /chat\.setGroupProfileTag/);
  assert.match(desktop, /chat\.setGroupProfileTag/);
  assert.match(profile, /ProfileGroupTagVisual/);
});
