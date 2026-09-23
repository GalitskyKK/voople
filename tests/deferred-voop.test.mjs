import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Voop is stored separately and creates no Split before acceptance", async () => {
  const [migration, manifest, data, service, hook] = await Promise.all([
    read("drizzle/72-deferred-voop.sql"),
    read("scripts/migration-manifest.mjs"),
    read("src/server/data/core-room-invitations-rest.ts"),
    read("src/server/services/core-room-invitations.service.ts"),
    read("src/hooks/useGroupNowRoomCreate.ts"),
  ]);

  assert.match(manifest, /"72-deferred-voop\.sql"/);
  assert.match(migration, /intent varchar\(20\) NOT NULL DEFAULT 'join_room'/);
  assert.match(migration, /target_room_session_id uuid/);
  assert.match(migration, /UNIQUE \(chat_id, room_session_id, invitee_id, intent\)/);
  assert.match(data, /onConflict: "chat_id,room_session_id,invitee_id,intent"/);
  assert.match(service, /sendCoreVoopRequest[\s\S]+intent: "voop"/);
  const sendBody = service.slice(
    service.indexOf("export async function sendCoreVoopRequest"),
    service.indexOf("export async function acceptCoreVoopRequest"),
  );
  assert.doesNotMatch(sendBody, /createAndJoinGroupRoom|joinGroupRoom/);
  assert.match(sendBody, /context\.participantIds\.includes\(input\.inviteeId\)/);
  assert.match(data, /\.gt\("last_seen_at", new Date\(Date\.now\(\) - 120_000\)\.toISOString\(\)\)/);
  assert.match(hook, /coreSendVoop\.useMutation/);
  assert.match(hook, /coreVoopStatus\.useQuery/);
});

test("accepting Voop moves both participants and publishes the target session", async () => {
  const [service, router, actions, people] = await Promise.all([
    read("src/server/services/core-room-invitations.service.ts"),
    read("src/server/trpc/routers/chat-core-rework.ts"),
    read("src/components/notifications/RoomInviteNotificationActions.tsx"),
    read("src/components/chat/GroupPeoplePanel.tsx"),
  ]);

  const acceptBody = service.slice(
    service.indexOf("export async function acceptCoreVoopRequest"),
    service.indexOf("export async function getCoreVoopStatus"),
  );
  assert.match(acceptBody, /createAndJoinGroupRoom/);
  assert.match(acceptBody, /context\.participantIds\.includes\(input\.userId\)/);
  assert.match(acceptBody, /joinGroupRoom\(\{[\s\S]+userId: request\.inviterId[\s\S]+allowCrossContext: true/);
  assert.ok(
    acceptBody.indexOf("joinGroupRoom({") < acceptBody.lastIndexOf("markCoreVoopAcceptedRest({"),
  );
  assert.match(router, /coreAcceptVoop:[\s\S]+createGroupRoomMediaToken/);
  assert.match(router, /transition: "voop"/);
  assert.match(actions, /coreAcceptVoop\.useMutation/);
  assert.match(actions, /invite\.intent === "voop"/);
  assert.match(people, /onVoop=\{currentSessionId/);
});

test("Voop status waits for the accepted Room read model instead of failing early", async () => {
  const hook = await read("src/hooks/useGroupNowRoomCreate.ts");

  assert.match(hook, /status\.status === "accepted" && !room\) return/);
  assert.match(hook, /refetchInterval: voopRequestId \? 1_500 : false/);
  assert.match(hook, /joinMutation\.mutateAsync/);
  assert.match(hook, /mediaHandoff\.connect/);
});
