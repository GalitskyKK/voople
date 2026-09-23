import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Voop is one-person consent using the same atomic Split aggregate", async () => {
  const [router, move, migration, actions, bridge] = await Promise.all([
    read("src/server/trpc/routers/chat-core-rework.ts"),
    read("src/hooks/useGroupLiveMove.ts"),
    read("drizzle/76-live-move-consent.sql"),
    read("src/components/notifications/RoomInviteNotificationActions.tsx"),
    read("src/components/chat/voice/LiveMoveHandoffBridge.tsx"),
  ]);
  const send = router.slice(router.indexOf("coreSendVoop:"), router.indexOf("coreVoopStatus:"));
  const accept = router.slice(router.indexOf("coreAcceptVoop:"), router.indexOf("coreRespondRoomInvite:"));
  assert.match(send, /requestLiveMove\(/);
  assert.match(send, /mode: "voop"/);
  assert.doesNotMatch(send, /sendCoreVoopRequest\(/);
  assert.match(accept, /respondLiveMove\(/);
  assert.doesNotMatch(accept, /acceptCoreVoopRequest\(/);
  assert.match(move, /send\("voop", \[user\]\)/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.respond_live_move/);
  assert.match(actions, /coreRespondLiveMove\.useMutation/);
  assert.match(bridge, /coreMyLiveMoves\.useQuery/);
  assert.match(bridge, /coreRoomMediaToken\.useMutation/);
});
