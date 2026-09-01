import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("create Room dialog uses one atomic request and preserves explicit switch consent", async () => {
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
  assert.match(hook, /micMuted: true/);
  assert.match(hook, /mediaHandoff\.connect/);
  assert.match(dialog, /Тип комнаты/);
  assert.match(dialog, /Только для администраторов/);
  assert.match(dialog, /Создать и зайти/);
  assert.match(dialog, /Завершить и создать/);
  assert.match(connected, /GroupNowRoomCreateDialog/);
  assert.match(connected, /canCreatePinned/);
});
