import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("quick Room create uses one atomic request and only opens cross-context consent", async () => {
  const [hook, dialog, connected] = await Promise.all([
    readFile(new URL("../src/hooks/useGroupNowRoomCreate.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowRoomCreateDialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowConnectedPanel.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(hook, /coreCreateAndJoinRoom\.useMutation/);
  assert.match(hook, /requestId: crypto\.randomUUID\(\)/);
  assert.match(hook, /retryCreation\.kind === draft\.kind/);
  assert.match(hook, /retryCreation\.name === draft\.name/);
  assert.match(hook, /setRetryCreation\(pendingCreation\)/);
  assert.match(hook, /finishCreate\(pendingCreation, false\)/);
  assert.match(hook, /finishCreate\(confirmation, true\)/);
  assert.match(hook, /name: "Новая комната"/);
  assert.match(hook, /void submit\(DEFAULT_ROOM_DRAFT\)/);
  assert.match(hook, /setOpen\(true\)/);
  assert.match(hook, /micMuted: true/);
  assert.match(hook, /mediaHandoff\.connect/);
  assert.match(dialog, /Тип комнаты/);
  assert.match(dialog, /Только для администраторов/);
  assert.match(dialog, /Создать и зайти/);
  assert.match(dialog, /Завершить и создать/);
  assert.match(dialog, /return props\.open \? <RoomCreateSession \{\.\.\.props\} \/> : null/);
  assert.doesNotMatch(dialog, /useEffect/);
  assert.match(connected, /GroupNowRoomCreateDialog/);
  assert.match(connected, /canCreatePinned/);
  assert.match(connected, /createPending=\{create\.pending\}/);
  assert.match(connected, /createError=\{create\.error\}/);
  assert.match(connected, /onBack=\{create\.close\}/);
});
