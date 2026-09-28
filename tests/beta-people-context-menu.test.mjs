import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { canVoopGroupMember, currentSessionParticipantIds, groupPeopleSections } from "../src/lib/chat/group-people.ts";
import { resolveContextMenuPosition } from "../src/lib/layout/context-menu-position.ts";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const member = (id, activeRoom = null) => ({ id, displayName: id, activeRoom });
const room = { chatId: "room", name: "Лобби" };

test("Voop is offered only to another member of the viewer's current active session", () => {
  const now = { rooms: [
    { liveSessionId: "current", state: "active", participants: [{ id: "self" }, { id: "same" }, { id: "guest", guest: true }] },
    { liveSessionId: "other", state: "active", participants: [{ id: "elsewhere" }] },
  ] };
  const ids = currentSessionParticipantIds(now, "current");
  assert.equal(canVoopGroupMember(member("same", room), "self", ids), true);
  assert.equal(canVoopGroupMember(member("self", room), "self", ids), false);
  assert.equal(canVoopGroupMember(member("elsewhere", room), "self", ids), false);
  assert.equal(canVoopGroupMember(member("online"), "self", ids), false);
  assert.equal(canVoopGroupMember(member("guest", room), "self", ids), false);
  assert.equal(canVoopGroupMember(member("same", room), "self", currentSessionParticipantIds(now, "stale")), false);
});

test("People sections count voice, available and offline members independently", () => {
  const now = { rooms: [
    { id: "lobby", name: "Лобби", liveSessionId: "live-1", state: "active", participants: [{ id: "voice" }] },
    { id: "stale", name: "Старая", liveSessionId: null, state: "grace", participants: [{ id: "offline" }] },
  ], onlineOutsideRooms: [] };
  const sections = groupPeopleSections(
    [member("offline"), member("available"), member("voice", room)],
    new Set(["available", "voice"]),
    now,
  );
  assert.deepEqual([sections.live.length, sections.available.length, sections.offline.length], [1, 1, 1]);
  assert.deepEqual(sections.live.map((person) => person.id), ["voice"]);
  assert.deepEqual(sections.liveRooms.map((item) => item.name), ["Лобби"]);
});

const menu = (anchor, viewportWidth = 800, viewportHeight = 600) =>
  resolveContextMenuPosition({ anchor, menuWidth: 200, menuHeight: 160, viewportWidth, viewportHeight });

test("context menu keeps normal click coordinates", () => {
  assert.deepEqual(menu({ kind: "point", x: 100, y: 90 }), { left: 100, top: 90 });
});
test("context menu corrects right, bottom and combined collisions", () => {
  assert.deepEqual(menu({ kind: "point", x: 750, y: 90 }), { left: 550, top: 90 });
  assert.deepEqual(menu({ kind: "point", x: 100, y: 570 }), { left: 100, top: 410 });
  assert.deepEqual(menu({ kind: "point", x: 750, y: 570 }), { left: 550, top: 410 });
});
test("context menu anchors keyboard opening to the message rect and clamps tiny viewports", () => {
  assert.deepEqual(menu({ kind: "rect", left: 120, top: 100, right: 420, bottom: 130 }), { left: 120, top: 130 });
  assert.deepEqual(menu({ kind: "point", x: 100, y: 100 }, 120, 100), { left: 8, top: 8 });
});

test("message menu uses one action tree for RMB, keyboard and the existing trigger", () => {
  const bubble = source("src/components/chat/ChatMessageBubble.tsx");
  const visual = source("src/components/chat/ChatMessageBubbleVisual.tsx");
  const dropdown = source("src/components/ui/DropdownMenu.tsx");
  const actions = source("src/components/chat/ChatMessageMenu.tsx");
  assert.match(bubble, /x: event\.clientX, y: event\.clientY/);
  assert.match(bubble, /event\.key === "ContextMenu" \|\| \(event\.shiftKey && event\.key === "F10"\)/);
  assert.match(bubble, /getBoundingClientRect\(\)/);
  assert.match(visual, /onContextMenu=\{onContextMenu\}/);
  assert.match(dropdown, /resolveContextMenuPosition/);
  assert.match(dropdown, /restoreFocusElement\?\.isConnected/);
  assert.match(dropdown, /role=\{contentRole\}/);
  assert.match(actions, /<DropdownMenu/);
  assert.match(actions, /onClick=\{onTriggerOpen\}/);
  assert.equal((bubble.match(/<ChatMessageMenu/g) ?? []).length, 1);
});

test("sidebar search and new-dialog navigation stay inside beta People/Groups search", () => {
  const sidebar = source("src/components/layout/MessengerSidebarView.tsx");
  const navigation = source("src/components/layout/AppNavigationVisual.tsx");
  const search = source("src/components/explore/ExploreView.tsx");
  assert.ok(sidebar.indexOf("voople-messenger-sidebar__search-wrap") < sidebar.indexOf('data-voople-scroll=""'));
  assert.match(sidebar, /label: "Новый диалог"/);
  assert.doesNotMatch(sidebar, /from=messages/);
  assert.match(navigation, /mode === "authenticated" \? "\/messages" : "\/feed"/);
  assert.match(search, /Люди и публичные группы/);
  assert.doesNotMatch(search, /\["posts", "Посты"\]/);
});
