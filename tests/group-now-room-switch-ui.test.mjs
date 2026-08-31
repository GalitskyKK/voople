import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  isCrossContextRoomJoinError,
  roomJoinErrorMessage,
} from "../src/lib/chat/group-room-join.ts";

test("room switch recognizes structured and fallback precondition errors", () => {
  assert.equal(isCrossContextRoomJoinError({ data: { code: "PRECONDITION_FAILED" } }), true);
  assert.equal(isCrossContextRoomJoinError({ shape: { data: { code: "PRECONDITION_FAILED" } } }), true);
  assert.equal(isCrossContextRoomJoinError({
    message: "Сначала подтвердите завершение текущего разговора",
  }), true);
  assert.equal(isCrossContextRoomJoinError({ data: { code: "FORBIDDEN" } }), false);
  assert.equal(roomJoinErrorMessage(new Error("Сеть недоступна")), "Сеть недоступна");
  assert.equal(roomJoinErrorMessage(null), "Не удалось перейти в комнату");
});

test("Group Now join controller never confirms a cross-context switch silently", async () => {
  const [hook, dialog, connectedPanel] = await Promise.all([
    readFile(new URL("../src/hooks/useGroupNowRoomJoin.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowRoomSwitchDialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowConnectedPanel.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(hook, /confirmedCrossContext,?/);
  assert.match(hook, /finishJoin\(room, false\)/);
  assert.match(hook, /isCrossContextRoomJoinError\(error\)/);
  assert.match(hook, /setConfirmationRoom\(room\)/);
  assert.match(hook, /finishJoin\(room, true\)/);
  assert.match(hook, /micMuted: true/);
  assert.match(hook, /coreLeaveRoom\.useMutation/);
  assert.match(hook, /sessionId: result\.sessionId/);
  assert.match(hook, /coreGroupNow\.invalidate/);
  assert.match(dialog, /closeOnEscape=!\{pending\}|closeOnEscape=\{!pending\}/);
  assert.match(dialog, /Завершить и перейти/);
  assert.match(dialog, /role="alert"/);
  assert.match(connectedPanel, /enabled = false/);
  assert.match(connectedPanel, /GroupNowPanel/);
  assert.match(connectedPanel, /GroupNowRoomSwitchDialog/);
  assert.doesNotMatch(connectedPanel, /desktop\/src|navigator\.userAgent/);
});
