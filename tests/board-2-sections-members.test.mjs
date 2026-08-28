import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("Board 2 keeps section creation in the section strip on web and desktop", () => {
  const sections = read("src/components/chat/ChatSectionsBarView.tsx");
  const web = read("src/components/chat/ChatSectionsBar.tsx");
  const desktop = read("desktop/src/adapters/DesktopChatThreadAdapter.tsx");
  const header = read("src/components/chat/ChatWindowHeader.tsx");

  assert.match(sections, /createAction/);
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
