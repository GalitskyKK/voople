import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { splitCandidates, toggleSplitSelection, selectedSplitUsers } from "../src/lib/chat/live-move-selection.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Split picker selects 1..N current members, never self or guests", () => {
  const people = [
    { id: "a", isMe: true, guest: false },
    { id: "b", isMe: false, guest: false },
    { id: "c", isMe: false, guest: false },
    { id: "d", isMe: false, guest: true },
  ];
  const candidates = splitCandidates(people);
  assert.deepEqual(candidates.map((p) => p.id), ["b", "c"]);
  assert.deepEqual(selectedSplitUsers(candidates, []), []);
  const selected = toggleSplitSelection(toggleSplitSelection([], "b"), "c");
  assert.deepEqual(selectedSplitUsers(candidates, selected).map((p) => p.id), ["b", "c"]);
  assert.deepEqual(toggleSplitSelection(selected, "b"), ["c"]);
  assert.deepEqual(selectedSplitUsers(candidates, ["d"]), []);
});

test("ordinary create stays pinned; Split submits once after selection", async () => {
  const [hook, move, picker, panel, router, service] = await Promise.all([
    read("src/hooks/useGroupNowRoomCreate.ts"),
    read("src/hooks/useGroupLiveMove.ts"),
    read("src/components/chat/GroupNowSplitPicker.tsx"),
    read("src/components/chat/GroupNowConnectedPanel.tsx"),
    read("src/server/trpc/routers/chat-core-rework.ts"),
    read("src/server/services/group-room-mutations.service.ts"),
  ]);
  assert.match(hook, /coreCreateAndJoinRoom\.useMutation/);
  assert.match(hook, /useGroupLiveMove/);
  assert.doesNotMatch(hook, /coreSendVoop|coreVoopStatus|coreJoinRoom\.useMutation/);
  assert.match(move, /startVoop: \(user: GroupNowUser\) =>/);
  assert.match(move, /send\("voop", \[user\]\)/);
  assert.match(move, /submitSplit: \(users: GroupNowUser\[\]\) => \{ void send\("split", users\)/);
  assert.match(move, /requestMutation\.mutateAsync\(/);
  assert.match(picker, /type="checkbox"/);
  assert.match(picker, /disabled=\{!chosen\.length \|\| pending\}/);
  assert.match(picker, /onSubmit\(chosen\)/);
  assert.doesNotMatch(picker, /onChoose\(user\)/);
  assert.match(panel, /onSubmit=\{create\.submitSplit\}/);
  assert.match(panel, /onCreateSplit=\{create\.startSplit\}/);
  const ordinaryCreate = router.slice(router.indexOf("coreCreateRoom:"), router.indexOf("coreSetRoomKind:"));
  assert.doesNotMatch(ordinaryCreate, /kind: input\.kind/);
  assert.match(ordinaryCreate, /kind: "pinned"/);
  assert.match(service, /createGroupRoomRest\(\{ \.\.\.input, kind: "pinned", name \}\)/);
});
