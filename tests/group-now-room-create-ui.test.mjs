import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ordinary Room is pinned and Split enters the consent picker", async () => {
  const [hook, dialog, connected, room, picker, router, service] = await Promise.all([
    readFile(new URL("../src/hooks/useGroupNowRoomCreate.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowRoomCreateDialog.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowConnectedPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowRoomSection.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chat/GroupNowSplitPicker.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/server/trpc/routers/chat-core-rework.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/group-room-mutations.service.ts", import.meta.url), "utf8"),
  ]);

  assert.match(hook, /coreCreateAndJoinRoom\.useMutation/);
  assert.match(hook, /requestId: crypto\.randomUUID\(\)/);
  assert.match(hook, /retryCreation\.name === draft\.name/);
  assert.match(hook, /setRetryCreation\(pendingCreation\)/);
  assert.match(hook, /finishCreate\(pendingCreation, false\)/);
  assert.match(hook, /finishCreate\(confirmation, true\)/);
  assert.doesNotMatch(hook, /DEFAULT_SPLIT_DRAFT|kind: "temporary"/);
  assert.match(hook, /const startSplit = useCallback\(\(\) =>/);
  assert.match(hook, /const startVoop = useCallback\(\(user: GroupNowUser\) =>/);
  const splitFlow = hook.slice(hook.indexOf("const startSplit ="), hook.indexOf("const chooseSplitCandidate ="));
  assert.match(splitFlow, /resolveCurrentLiveSessionId\(now\)/);
  assert.match(splitFlow, /setSplitCandidates\(candidates\)/);
  assert.match(splitFlow, /!person\.isMe && !person\.guest/);
  assert.doesNotMatch(splitFlow, /sendVoopMutation|inviteeId|user\.id/);
  assert.doesNotMatch(splitFlow, /submit\(/);
  assert.match(hook, /startVoop\(user\)/);
  assert.match(hook, /utils\.client\.chat\.coreGroupNow\.query\(\{ groupId \}\)/);
  assert.match(hook, /resolveCurrentLiveSessionId\(now\)/);
  assert.match(hook, /coreSendVoop\.useMutation/);
  assert.match(hook, /sessionId: liveSessionId/);
  const voopFlow = hook.slice(hook.indexOf("const startVoop ="), hook.indexOf("const startSplit ="));
  assert.match(voopFlow, /inviteeId: user\.id/);
  assert.match(voopFlow, /sendVoopMutation\.mutateAsync/);
  assert.doesNotMatch(hook, /coreSendRoomInvite\.useMutation/);
  assert.match(hook, /const showRoom = useCallback/);
  assert.match(hook, /setOpen\(true\)/);
  assert.match(hook, /micMuted: true/);
  assert.match(hook, /mediaHandoff\.connect/);
  assert.match(dialog, /onSubmit\(\{ name: trimmedName \}\)/);
  assert.match(dialog, /останется в группе/);
  assert.doesNotMatch(dialog, /Тип комнаты/);
  assert.doesNotMatch(dialog, /Временная/);
  assert.match(dialog, /Создать и зайти/);
  assert.match(dialog, /Завершить и создать/);
  assert.match(dialog, /return props\.open \? <RoomCreateSession \{\.\.\.props\} \/> : null/);
  assert.doesNotMatch(dialog, /useEffect/);
  assert.match(connected, /GroupNowRoomCreateDialog/);
  assert.match(connected, /GroupNowSplitPicker/);
  assert.match(connected, /onCreateSplit=\{create\.startSplit\}/);
  assert.match(connected, /canCreatePinned \? create\.showRoom : undefined/);
  assert.match(connected, /createPending=\{create\.pending\}/);
  assert.match(connected, /createError=\{create\.error\}/);
  assert.match(connected, /onBack=\{create\.close\}/);
  assert.match(room, /onCreateSplit\?: \(\) => void/);
  assert.match(room, /Отделиться во временную комнату/);
  assert.match(room, /onClick=\{\(\) => onCreateSplit\?\.\(\)\}/);
  assert.match(picker, /candidates\?\.map/);
  assert.match(picker, /onChoose\(user\)/);
  const ordinaryCreate = router.slice(router.indexOf("coreCreateRoom:"), router.indexOf("coreSetRoomKind:"));
  assert.match(ordinaryCreate, /z\.strictObject/);
  assert.doesNotMatch(ordinaryCreate, /kind: roomKindSchema|kind: input\.kind/);
  assert.match(ordinaryCreate, /kind: "pinned"/);
  assert.match(service, /createGroupRoomRest\(\{ \.\.\.input, kind: "pinned", name \}\)/);
});
