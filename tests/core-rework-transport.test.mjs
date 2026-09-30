import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveServerFeatureAccess } from "../src/lib/product/server-feature-access.ts";

const userId = "00000000-0000-4000-8000-000000000001";

test("server rollout config defaults to stable with capabilities disabled", () => {
  assert.deepEqual(resolveServerFeatureAccess("multi_room_groups", userId, {}), {
    enabled: false,
    reason: "server",
  });
});

test("stable Group Rooms ignores the internal allowlist but still needs its capability", () => {
  const base = {
    VOOPLE_RELEASE_CHANNEL: "internal",
    VOOPLE_SERVER_CAPABILITIES: "multi_room_groups",
  };
  assert.deepEqual(resolveServerFeatureAccess("multi_room_groups", userId, base), {
    enabled: true,
    reason: "available",
  });
  assert.deepEqual(resolveServerFeatureAccess("multi_room_groups", userId, {
    ...base,
    VOOPLE_INTERNAL_USER_IDS: "00000000-0000-4000-8000-000000000002",
  }), {
    enabled: true,
    reason: "available",
  });
  assert.deepEqual(resolveServerFeatureAccess("multi_room_groups", userId, {
    VOOPLE_RELEASE_CHANNEL: "internal",
  }), { enabled: false, reason: "server" });
});

test("beta transport requires capability but not the internal user allowlist", () => {
  const beta = { VOOPLE_RELEASE_CHANNEL: "beta" };
  assert.deepEqual(resolveServerFeatureAccess("multi_room_groups", userId, beta), {
    enabled: false,
    reason: "server",
  });
  assert.deepEqual(resolveServerFeatureAccess("multi_room_groups", userId, {
    ...beta,
    VOOPLE_SERVER_CAPABILITIES: "multi_room_groups",
  }), {
    enabled: true,
    reason: "available",
  });
  assert.deepEqual(resolveServerFeatureAccess("multi_room_groups", userId, {
    VOOPLE_RELEASE_CHANNEL: "stable",
    VOOPLE_SERVER_CAPABILITIES: "multi_room_groups",
  }), {
    enabled: true,
    reason: "available",
  });
});

test("pre-stable features keep the internal allowlist and their channel rules", () => {
  const internal = {
    VOOPLE_RELEASE_CHANNEL: "internal",
    VOOPLE_SERVER_CAPABILITIES: "saved_messages,core_rework_shell",
  };
  for (const feature of ["saved_messages", "core_rework_shell"]) {
    assert.deepEqual(resolveServerFeatureAccess(feature, userId, internal), {
      enabled: false, reason: "user",
    });
    assert.deepEqual(resolveServerFeatureAccess(feature, userId, {
      ...internal, VOOPLE_INTERNAL_USER_IDS: userId,
    }), { enabled: true, reason: "available" });
    assert.deepEqual(resolveServerFeatureAccess(feature, userId, {
      ...internal, VOOPLE_SERVER_CAPABILITIES: "",
      VOOPLE_INTERNAL_USER_IDS: userId,
    }), { enabled: false, reason: "server" });
    assert.deepEqual(resolveServerFeatureAccess(feature, userId, {
      VOOPLE_RELEASE_CHANNEL: "stable",
      VOOPLE_SERVER_CAPABILITIES: feature,
      VOOPLE_INTERNAL_USER_IDS: userId,
    }), { enabled: false, reason: "channel" });
  }
  assert.deepEqual(resolveServerFeatureAccess("saved_messages", userId, {
    VOOPLE_RELEASE_CHANNEL: "beta",
    VOOPLE_SERVER_CAPABILITIES: "saved_messages",
  }), { enabled: false, reason: "channel" });
  assert.deepEqual(resolveServerFeatureAccess("core_rework_shell", userId, {
    VOOPLE_RELEASE_CHANNEL: "beta",
    VOOPLE_SERVER_CAPABILITIES: "core_rework_shell",
  }), { enabled: true, reason: "available" });
});

test("core rework transport is fail-closed and pre-stable features are user allowlisted", async () => {
  const [access, service, env] = await Promise.all([
    readFile(new URL("../src/lib/product/server-feature-access.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/services/product-feature-access.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  assert.match(access, /: "stable"/);
  assert.match(access, /VOOPLE_SERVER_CAPABILITIES/);
  assert.match(access, /VOOPLE_INTERNAL_USER_IDS/);
  assert.match(access, /channel === "internal"/);
  assert.match(access, /ProductFeatureUnavailableError/);
  assert.match(service, /process\.env/);
  assert.match(env, /VOOPLE_RELEASE_CHANNEL=stable/);
  assert.match(env, /VOOPLE_SERVER_CAPABILITIES=/);
  assert.match(env, /VOOPLE_INTERNAL_USER_IDS=/);
});

test("every core Room procedure enforces capability access", async () => {
  const [router, rootRouter] = await Promise.all([
    readFile(new URL("../src/server/trpc/routers/chat-core-rework.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/server/trpc/routers/chat.ts", import.meta.url), "utf8"),
  ]);

  for (const procedure of [
    "coreGroupNow",
    "coreCreateRoom",
    "coreCreateAndJoinRoom",
    "coreSetRoomKind",
    "coreArchiveRoom",
    "coreJoinRoom",
    "coreRoomInviteCandidates",
    "coreRoomInvitePreview",
    "coreSendRoomInvite",
    "coreRespondRoomInvite",
    "coreCancelRoomInvite",
    "coreRoomMediaToken",
    "coreRoomScreenAudioToken",
    "coreLeaveRoom",
    "coreHeartbeatRoom",
  ]) {
    assert.match(router, new RegExp(`${procedure}:[\\s\\S]*?assertMultiRoomAccess`));
  }
  assert.match(router, /confirmedCrossContext: z\.boolean\(\)\.default\(false\)/);
  assert.match(router, /code: "PRECONDITION_FAILED"/);
  assert.match(router, /sessionId: z\.string\(\)\.uuid\(\)/);
  assert.match(rootRouter, /\.\.\.chatCoreReworkProcedures/);
});

test("internal mutations keep validation, limits and privacy-safe telemetry", async () => {
  const router = await readFile(
    new URL("../src/server/trpc/routers/chat-core-rework.ts", import.meta.url),
    "utf8",
  );

  assert.match(router, /name: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(80\)/);
  assert.match(router, /rateLimits\.manageGroupChat/);
  assert.match(router, /rateLimits\.enterChatRoom/);
  assert.match(router, /coreRoomMediaToken:[\s\S]*?sessionId: z\.string\(\)\.uuid\(\)/);
  assert.match(router, /name: "room_created"/);
  assert.match(router, /name: "room_joined"/);
  assert.match(router, /name: "room_left"/);
  assert.doesNotMatch(router, /properties: \{[^}]*roomId/);
});
