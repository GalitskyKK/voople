import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Room switcher management uses server-owned permissions and existing mutations", async () => {
  const [types, data, service, adapter, builder, switcher, selector, menu, visual] = await Promise.all([
    readFile(new URL("../src/types/group-now.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/data/group-now-rest.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/group-now.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/useVoiceRoomServerAdapter.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/buildVoiceRoomSwitcherModel.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/VoiceRoomSwitcher.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/VoiceRoomSelector.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/voice/VoiceRoomActionsMenu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../scripts/verify-core-rework-room-surface.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(types, /canManage\?: boolean/);
  assert.match(types, /canPin\?: boolean/);
  assert.match(data, /created_at, created_by/);
  assert.match(service, /room\.createdBy === viewerId/);
  assert.match(service, /membership\.role === "owner" \|\| membership\.role === "admin"/);
  assert.match(adapter, /coreSetRoomKind\.useMutation/);
  assert.match(adapter, /coreArchiveRoom\.useMutation/);
  assert.match(adapter, /onSetPinned|setPinned/);
  assert.match(builder, /management: actions\.supported/);
  assert.match(switcher, /room\.canManage && room\.kind !== "lobby"/);
  assert.match(switcher, /VoiceRoomActionsMenu/);
  assert.match(selector, /VoiceRoomActionsMenu/);
  assert.match(selector, /placement="bottom"/);
  assert.match(selector, /aria-label="Перейти в Лобби"/);
  assert.match(selector, /contentRole="dialog"/);
  assert.match(menu, /contentRole=\{mode === "actions" \? "menu" : "dialog"\}/);
  assert.match(menu, /room\.participantCount > 0/);
  assert.match(menu, /Архивировать «\{room\.name\}»/);
  assert.match(menu, /event\.key !== "Escape"/);
  assert.doesNotMatch(menu, /<Sheet|<Dialog/);
  assert.match(visual, /--room-actions-only/);
  assert.match(visual, /--room-picker-only/);
  assert.match(visual, /Выбрать комнату\\\. Сейчас: DRG/);
});
