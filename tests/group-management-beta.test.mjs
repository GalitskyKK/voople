import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("People uses fresh GroupNow rooms and keeps Voop bound to the active session", () => {
  const model = read("src/lib/chat/group-people.ts");
  const controller = read("src/components/chat/GroupPeoplePanel.tsx");
  const view = read("src/components/chat/GroupPeoplePanelView.tsx");
  const rows = read("src/components/chat/GroupPeopleSection.tsx");
  assert.match(model, /room\.state !== "active" && room\.state !== "connecting"/);
  assert.match(model, /room\.participants[\s\S]*?!person\.guest/);
  assert.match(model, /currentParticipantIds\.has\(member\.id\)/);
  assert.match(controller, /trpc\.chat\.coreGroupNow\.useQuery/);
  assert.match(controller, /currentSessionParticipantIds\(now\.data, currentSessionId\)/);
  assert.match(view, /sections\.liveRooms\.map/);
  assert.match(rows, /max-w-\[360px\]/);
  assert.match(rows, /variant === "live" && onVoop && canVoopGroupMember/);
});

test("Group Settings has one beta IA and a dedicated authorized summary read", () => {
  const nav = read("src/components/chat/GroupSettingsNavigation.tsx");
  const page = read("src/components/chat/GroupSettingsPage.tsx");
  const data = read("src/server/data/group-settings-summary-rest.ts");
  const router = read("src/server/trpc/routers/chat.ts");
  const sheet = read("src/components/chat/GroupManagementSheetView.tsx");
  assert.deepEqual([...nav.matchAll(/\["(main|people|access|appearance|advanced)",/g)].map((match) => match[1]), ["main", "people", "access", "appearance", "advanced"]);
  assert.doesNotMatch(nav, /boosts|"audit"|"media"|"roles"/);
  assert.match(page, /chat\.groupSettingsSummary\.useQuery/);
  assert.doesNotMatch(page, /observeMessages/);
  assert.match(router, /groupSettingsSummary: protectedProcedure/);
  assert.match(data, /getChatMembershipRest\(chatId, userId\)/);
  assert.match(data, /membership\.type !== "group" \|\| membership\.parentChatId/);
  assert.doesNotMatch(data, /observeMessages|listMessagesRest|chat_messages/);
  assert.match(sheet, /section === "access"[\s\S]*?<GroupVisibilitySettings/);
  assert.match(sheet, /section === "advanced" && props\.canManage/);
  assert.doesNotMatch(sheet, /<GroupBoostPanel/);
  assert.match(read("src/components/chat/GroupVisibilitySettings.tsx"), /Видна в поиске/);
  assert.doesNotMatch(read("src/components/chat/GroupVisibilitySettings.tsx"), /Видна в рекомендациях/);
});

test("Group Info is summary-only and reaches canonical People tab", () => {
  const view = read("src/components/chat/GroupInfoDrawerView.tsx");
  const controller = read("src/components/chat/GroupInfoDrawer.tsx");
  const surface = read("src/components/chat/GroupSurfaceShell.tsx");
  assert.match(view, /preview = \[\.\.\.\(members \?\? \[\]\)\][\s\S]*?slice\(0, 5\)/);
  assert.match(view, /Все люди/);
  assert.doesNotMatch(view, /Фильтр участников|onTabChange|MemberFilter/);
  assert.match(controller, /selectGroupTab\?\.\("people"\)/);
  assert.match(surface, /GroupSurfaceNavigationContext\.Provider value=\{setActiveTab\}/);
});

test("membership invite uses auth continuation and cannot be mistaken for Room or Voop", () => {
  const invite = read("src/components/chat/ChatInvitePage.tsx");
  const exact = read("src/components/chat/voice/CoreRoomInvitePreviewView.tsx");
  const controller = read("src/components/chat/voice/CoreRoomInvitePreview.tsx");
  assert.match(invite, /Вас приглашают в группу/);
  assert.match(invite, /Вступить в группу/);
  assert.match(invite, /Микрофон не включится автоматически/);
  assert.match(invite, /authenticated === false[\s\S]*?authEntryHref\("\/login", `\/invite\/\$\{token\}`\)/);
  assert.match(invite, /router\.replace\(`\/messages\/\$\{chatId\}`\)/);
  assert.doesNotMatch(invite, /href="\/feed"|Вступить в беседу/);
  assert.match(exact, /state\.invite\.room\.name/);
  assert.match(exact, /state\.invite\.room\.hasScreenShare/);
  assert.match(exact, /state\.invite\.expiresAt/);
  assert.match(controller, /RoomInviteNotificationActions invite=\{state\.invite\}/);
});
