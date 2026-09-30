import assert from "node:assert/strict";
import test from "node:test";

import {
  FEATURE_AVAILABILITY,
  PRODUCT_FEATURES,
  resolveFeatureAvailability,
} from "../src/lib/product/feature-availability.ts";

test("every product feature has one availability rule", () => {
  assert.deepEqual(Object.keys(FEATURE_AVAILABILITY).sort(), [...PRODUCT_FEATURES].sort());
});

test("stable messenger core stays available on current platforms", () => {
  for (const platform of ["web", "windows"]) {
    assert.deepEqual(resolveFeatureAvailability("direct_messages", {
      platform,
      channel: "stable",
    }), {
      enabled: true,
      exposure: "primary",
      fallbackHref: "/messages",
      reason: "available",
    });
  }
});

test("unreleased platform apps stay disabled until their vertical slice ships", () => {
  for (const platform of ["macos", "linux", "android", "ios"]) {
    const availability = resolveFeatureAvailability("direct_messages", {
      platform,
      channel: "stable",
    });
    assert.equal(availability.enabled, false);
    assert.equal(availability.reason, "platform");
  }
});

test("core rework surfaces require beta-or-internal channel and server capability", () => {
  assert.equal(resolveFeatureAvailability("core_rework_shell", {
    platform: "web",
    channel: "stable",
    serverCapabilities: new Set(["core_rework_shell"]),
  }).reason, "channel");

  assert.equal(resolveFeatureAvailability("core_rework_shell", {
    platform: "web",
    channel: "internal",
  }).reason, "server");

  assert.equal(resolveFeatureAvailability("core_rework_shell", {
    platform: "web",
    channel: "internal",
    serverCapabilities: new Set(["core_rework_shell"]),
  }).enabled, true);

  assert.equal(resolveFeatureAvailability("core_rework_shell", {
    platform: "windows",
    channel: "beta",
    serverCapabilities: new Set(["core_rework_shell"]),
  }).enabled, true);
});

test("Group Rooms is stable on web and Windows only with its server capability", () => {
  for (const platform of ["web", "windows"]) {
    for (const channel of ["internal", "beta", "stable"]) {
      assert.equal(resolveFeatureAvailability("multi_room_groups", {
        platform, channel,
        serverCapabilities: new Set(["multi_room_groups"]),
      }).enabled, true);
      assert.equal(resolveFeatureAvailability("multi_room_groups", {
        platform, channel,
      }).reason, "server");
    }
  }
  assert.equal(resolveFeatureAvailability("multi_room_groups", {
    platform: "linux", channel: "stable",
    serverCapabilities: new Set(["multi_room_groups"]),
  }).reason, "platform");
});

test("other gated features retain their channels and platforms", () => {
  for (const feature of ["public_groups", "feed_recommendations", "core_rework_shell", "saved_messages"]) {
    assert.equal(resolveFeatureAvailability(feature, {
      platform: "web", channel: "stable",
      serverCapabilities: new Set([feature]),
    }).reason, "channel");
  }
  assert.equal(resolveFeatureAvailability("public_groups", {
    platform: "windows", channel: "beta",
  }).enabled, true);
  assert.equal(resolveFeatureAvailability("feed_recommendations", {
    platform: "windows", channel: "beta",
  }).reason, "platform");
  assert.equal(resolveFeatureAvailability("feed_recommendations", {
    platform: "web", channel: "beta",
  }).enabled, true);
  assert.equal(resolveFeatureAvailability("saved_messages", {
    platform: "web", channel: "beta",
    serverCapabilities: new Set(["saved_messages"]),
  }).reason, "channel");
});

test("Saved Messages stays hidden until its internal migration capability is ready", () => {
  assert.equal(resolveFeatureAvailability("saved_messages", {
    platform: "web",
    channel: "stable",
    serverCapabilities: new Set(["saved_messages"]),
  }).reason, "channel");

  assert.equal(resolveFeatureAvailability("saved_messages", {
    platform: "windows",
    channel: "internal",
  }).reason, "server");

  assert.equal(resolveFeatureAvailability("saved_messages", {
    platform: "windows",
    channel: "internal",
    serverCapabilities: new Set(["saved_messages"]),
  }).enabled, true);
});

test("web beta surfaces stay hidden on unsupported platforms and stable", () => {
  assert.equal(resolveFeatureAvailability("feed_recommendations", {
    platform: "web",
    channel: "beta",
  }).enabled, true);

  const desktopStable = resolveFeatureAvailability("feed_recommendations", {
    platform: "windows",
    channel: "stable",
  });
  assert.equal(desktopStable.enabled, false);
  assert.equal(desktopStable.exposure, "hidden");
  assert.equal(desktopStable.reason, "platform");
});
