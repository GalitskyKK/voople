import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("Board 2 keeps section creation in the section strip on web and desktop", () => {
  const sections = read("src/components/chat/ChatSectionsBarView.tsx");
  const picker = read("src/components/chat/ChatSectionPicker.tsx");
  const dropdown = read("src/components/ui/DropdownMenu.tsx");
  const web = read("src/components/chat/ChatSectionsBar.tsx");
  const desktop = read("desktop/src/adapters/DesktopChatThreadAdapter.tsx");
  const creator = read("src/components/chat/SubchatCreatorView.tsx");
  const header = read("src/components/chat/ChatWindowHeader.tsx");

  assert.match(sections, /createAction/);
  assert.match(sections, /<ChatSectionPicker/);
  assert.doesNotMatch(sections, /topicsLayout/);
  assert.doesNotMatch(sections, /overflow-x-auto/);
  assert.match(picker, /type="search"/);
  assert.match(picker, /Раздел не найден/);
  assert.match(picker, /data-dropdown-autofocus/);
  assert.match(picker, /Непрочитанное/);
  assert.match(picker, /unreadElsewhere/);
  assert.match(picker, /"ArrowDown", "ArrowUp", "Home", "End"/);
  assert.match(picker, /ChatUnreadBadge/);
  assert.match(picker, /createOpen/);
  assert.match(picker, /aria-label="Новый раздел"/);
  assert.match(picker, /createOpen \? createAction\(\{ open: true, onOpenChange: setCreateOpen \}\)/);
  assert.match(creator, /placeholder="Название раздела"/);
  assert.match(creator, /event\.key !== "Escape"/);
  assert.match(creator, /Иконка\{canRestrict \? " и доступ" : ""\}/);
  assert.doesNotMatch(creator, /<Sheet/);
  assert.doesNotMatch(picker, /text-\[10px\]/);
  assert.doesNotMatch(picker, /font-mono[^"\n]*uppercase/);
  assert.match(picker, /text-xs font-semibold leading-4/);
  assert.match(dropdown, /contentRole\?: "menu" \| "dialog"/);
  assert.match(dropdown, /requestAnimationFrame/);
  assert.match(web, /<SubchatCreator/);
  assert.match(desktop, /<DesktopSubchatCreatorAdapter/);
  assert.doesNotMatch(header, /SubchatCreator/);
});

test("Board 2 room context hides inaccessible sections and respects room privacy", () => {
  const presence = read("src/server/data/chat-group-room-presence-rest.ts");
  const members = read("src/server/data/chat-group-members-rest.ts");
  const view = read("src/components/chat/GroupInfoDrawerView.tsx");

  assert.match(presence, /section_access_mode/);
  assert.match(presence, /chat_section_members/);
  assert.match(presence, /filterUserIdsByPrivacyFieldRest/);
  assert.match(presence, /"roomsScope"/);
  assert.match(members, /activeRoom: activeRooms\.get\(user\.id\) \?\? null/);
  assert.match(view, /Сейчас в комнате · \{activeRoom\.name\}/);
});
