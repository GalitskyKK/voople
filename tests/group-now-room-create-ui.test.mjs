import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Split is atomic while permanent Room creation stays deliberate", async () => {
  const [hook, dialog, connected, room] = await Promise.all([
    readFile(new URL("../src/hooks/useGroupNowRoomCreate.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowRoomCreateDialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowConnectedPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowRoomSection.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(hook, /coreCreateAndJoinRoom\.useMutation/);
  assert.match(hook, /requestId: crypto\.randomUUID\(\)/);
  assert.match(hook, /retryCreation\.kind === draft\.kind/);
  assert.match(hook, /retryCreation\.name === draft\.name/);
  assert.match(hook, /setRetryCreation\(pendingCreation\)/);
  assert.match(hook, /finishCreate\(pendingCreation, false\)/);
  assert.match(hook, /finishCreate\(confirmation, true\)/);
  assert.match(hook, /DEFAULT_SPLIT_DRAFT/);
  assert.match(hook, /kind: "temporary"/);
  assert.match(hook, /name: "Сплит"/);
  assert.match(hook, /void submit\(DEFAULT_SPLIT_DRAFT\)/);
  assert.match(hook, /coreSendVoop\.useMutation/);
  assert.match(hook, /sessionId: currentSessionId/);
  assert.match(hook, /inviteeId: user\.id/);
  assert.doesNotMatch(hook, /coreSendRoomInvite\.useMutation/);
  assert.match(hook, /const showRoom = useCallback/);
  assert.match(hook, /setOpen\(true\)/);
  assert.match(hook, /micMuted: true/);
  assert.match(hook, /mediaHandoff\.connect/);
  assert.match(dialog, /kind: "pinned"/);
  assert.match(dialog, /останется в группе/);
  assert.doesNotMatch(dialog, /Тип комнаты/);
  assert.doesNotMatch(dialog, /Временная/);
  assert.match(dialog, /Создать и зайти/);
  assert.match(dialog, /Завершить и создать/);
  assert.match(dialog, /return props\.open \? <RoomCreateSession \{\.\.\.props\} \/> : null/);
  assert.doesNotMatch(dialog, /useEffect/);
  assert.match(connected, /GroupNowRoomCreateDialog/);
  assert.match(connected, /onCreateSplit=\{create\.startSplit\}/);
  assert.match(connected, /canCreatePinned \? create\.showRoom : undefined/);
  assert.match(connected, /createPending=\{create\.pending\}/);
  assert.match(connected, /createError=\{create\.error\}/);
  assert.match(connected, /onBack=\{create\.close\}/);
  assert.match(room, /onCreateSplit\?: \(\) => void/);
  assert.match(room, /Отделиться во временную комнату/);
  assert.match(room, /onClick=\{onCreateSplit\}/);
});
