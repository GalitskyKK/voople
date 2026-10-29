import "./helpers/style-plan-runtime.mjs";
import { registerHooks } from "node:module";
import assert from "node:assert/strict";
import test from "node:test";
import { assertOwnedUploadKey } from "../src/lib/object-storage/paths.ts";

globalThis.roomCoverTest = {};
registerHooks({ resolve(specifier, context, next) {
  const stubs = {
    "@/server/data/chat-access-rest": "export const getChatMembershipRest=async()=>{if(globalThis.roomCoverTest.denied)throw Error('Нет доступа');return globalThis.roomCoverTest.membership};",
    "@/server/data/group-room-mutations-rest": "export const getGroupRoomRecordRest=async()=>({id:'room',groupId:'group',createdBy:'creator'});",
    "@/server/data/room-covers-rest": "export const saveRoomCoverRest=async(id,userId,cover)=>{globalThis.roomCoverTest.writes.push({id,userId,cover});return {ok:true}};",
    "@/lib/object-storage": "export const readObjectBytes=async()=>globalThis.roomCoverTest.bytes;",
    "./upload.service": "export const resolvePublicMediaKey=async(key,user,purpose)=>{globalThis.roomCoverTest.assertOwned(key,user,purpose);return key;};",
  };
  if (specifier in stubs) return { shortCircuit: true, url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}` };
  return next(specifier, context);
} });
const { updateRoomCover, resolveRoomCover } = await import("../src/server/services/room-covers.service.ts");
const draft = { kind: "preset", preset: "wave" };
function setup(patch = {}) {
  return globalThis.roomCoverTest = { membership: { type: "group", parentChatId: null, role: "member" }, writes: [], assertOwned: assertOwnedUploadKey, ...patch };
}

test("cover editing requires membership and creator/admin authority before writing", async () => {
  for (const userId of ["creator", "admin"]) {
    const state = setup({ membership: { type: "group", parentChatId: null, role: userId === "admin" ? "admin" : "member" } });
    assert.deepEqual(await updateRoomCover({ roomId: "room", userId, cover: draft }), { ok: true });
    assert.equal(state.writes.length, 1);
  }
  for (const patch of [{}, { denied: true }, { membership: { type: "direct", role: "owner" } }, { membership: { type: "group", parentChatId: "parent", role: "admin" } }]) {
    const state = setup(patch);
    await assert.rejects(updateRoomCover({ roomId: "room", userId: "outsider", cover: draft }));
    assert.equal(state.writes.length, 0);
  }
});

test("foreign uploads and disguised non-image bytes cannot become room covers", async () => {
  const state = setup({ bytes: Buffer.from("this is not an image") });
  await assert.rejects(resolveRoomCover({ kind: "upload", mediaKey: "uploads/room-cover/other/image.png" }, "creator"));
  await assert.rejects(updateRoomCover({ roomId: "room", userId: "creator", cover: { kind: "upload", mediaKey: "uploads/room-cover/creator/image.png" } }));
  assert.equal(state.writes.length, 0);
  state.bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6XWQAAAAASUVORK5CYII=", "base64");
  assert.deepEqual(await resolveRoomCover({ kind: "upload", mediaKey: "uploads/room-cover/creator/image.png" }, "creator"), { preset: "orbit", mediaKey: "uploads/room-cover/creator/image.png" });
});
