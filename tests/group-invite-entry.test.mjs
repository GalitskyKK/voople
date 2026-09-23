import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("group membership invite copies a shared link directly on web and desktop", () => {
  const header = read("src/components/chat/GroupInfoDrawerView.tsx");
  const web = read("src/components/chat/GroupInfoDrawer.tsx");
  const desktop = read("desktop/src/adapters/DesktopChatThreadAdapter.tsx");
  const quickInvite = read("src/components/chat/useGroupInviteQuickCopy.tsx");

  assert.match(header, /canManage \? <button[^\n]+onClick=\{onInvite\}/);
  assert.match(header, /label="Пригласить в группу"/);
  assert.match(header, />Пригласить<\/button>/);
  assert.doesNotMatch(header, />В группу<\/button>/);
  assert.match(header, /label=\{canManage \? "Настройки группы"/);
  assert.match(header, /voople-group-header-tag/);
  assert.match(web, /onInvite=\{\(\) => \{ setOpen\(false\); void invite\.copy\(\); \}\}/);
  assert.match(web, /createInvite: \(\) => createInvite\.mutateAsync\(\{ chatId, lifetime: "7d" \}\)/);
  assert.match(desktop, /onInvite=\{\(\) => \{\s+groupPanel\.setOpen\(false\);\s+void invite\.copy\(\);/);
  assert.match(desktop, /"chat\.createInvite", \{ chatId, lifetime: "7d" \}/);
  assert.match(quickInvite, /navigator\.clipboard\.writeText/);
  assert.match(quickInvite, /cache\.current/);
  assert.match(quickInvite, /Ссылка скопирована · действует 7 дней/);
  assert.doesNotMatch(web, /GroupInviteQuickSheet/);
  assert.doesNotMatch(desktop, /GroupInviteQuickSheet/);
});

test("quick group links expire after seven days and permanent links remain explicit", () => {
  const router = read("src/server/trpc/routers/chat.ts");
  const data = read("src/server/data/chat-rooms-rest.ts");
  assert.match(router, /lifetime: z\.enum\(\["24h", "7d", "permanent"\]\)\.optional\(\)/);
  assert.match(data, /lifetime === "7d" \? 7 : 1/);
  assert.match(data, /expires_at: expiresAt/);
  assert.match(data, /lifetime: "24h" \| "7d" \| "permanent" = "permanent"/);
});
