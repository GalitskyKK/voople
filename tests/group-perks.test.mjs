import assert from "node:assert/strict";
import test from "node:test";

import {
  groupBoostLevel,
  groupAnimatedBannerEnabled,
  groupAnimatedIconEnabled,
  groupBannerEnabled,
  groupEmojiLimit,
  groupFileLimitBytes,
  groupSoundLimit,
  groupTagEnabled,
  groupVanityInviteEnabled,
  groupRoleStylesEnabled,
  screenShareQualityForEntitlements,
  resolveGroupPerkStates,
} from "../src/lib/group-perks.ts";

test("group boost levels only change at approved thresholds", () => {
  assert.deepEqual(
    [0, 1, 2, 3, 5, 6, 11, 12, 23, 24, 40].map(groupBoostLevel),
    [0, 1, 1, 3, 3, 6, 6, 12, 12, 24, 24],
  );
});

test("group perks match the product contract", () => {
  assert.deepEqual(
    [0, 1, 3, 6, 12, 24].map((level) => ({
      level,
      emoji: groupEmojiLimit(level),
      sounds: groupSoundLimit(level),
      fileMb: groupFileLimitBytes(level) / (1024 * 1024),
      banner: groupBannerEnabled(level),
      animatedIcon: groupAnimatedIconEnabled(level),
      animatedBanner: groupAnimatedBannerEnabled(level),
      tag: groupTagEnabled(level),
      vanity: groupVanityInviteEnabled(level),
      roleStyles: groupRoleStylesEnabled(level),
    })),
    [
      { level: 0, emoji: 10, sounds: 0, fileMb: 15, banner: true, animatedIcon: false, animatedBanner: false, tag: true, vanity: false, roleStyles: false },
      { level: 1, emoji: 20, sounds: 0, fileMb: 15, banner: true, animatedIcon: false, animatedBanner: false, tag: true, vanity: false, roleStyles: false },
      { level: 3, emoji: 50, sounds: 8, fileMb: 15, banner: true, animatedIcon: true, animatedBanner: false, tag: true, vanity: false, roleStyles: false },
      { level: 6, emoji: 100, sounds: 16, fileMb: 50, banner: true, animatedIcon: true, animatedBanner: true, tag: true, vanity: false, roleStyles: false },
      { level: 12, emoji: 150, sounds: 32, fileMb: 100, banner: true, animatedIcon: true, animatedBanner: true, tag: true, vanity: false, roleStyles: false },
      { level: 24, emoji: 250, sounds: 48, fileMb: 100, banner: true, animatedIcon: true, animatedBanner: true, tag: true, vanity: true, roleStyles: true },
    ],
  );
});

test("1080p/60 follows personal Plus or the full group level", () => {
  assert.equal(screenShareQualityForEntitlements(false, 0), "standard");
  assert.equal(screenShareQualityForEntitlements(false, 12), "standard");
  assert.equal(screenShareQualityForEntitlements(true, 0), "plus");
  assert.equal(screenShareQualityForEntitlements(false, 24), "plus");
});

test("boost capacity activates only selected perks and preserves suspended choices", () => {
  const limited = resolveGroupPerkStates({
    capacity: 3,
    level: 6,
    selectedIds: ["animated_icon", "emoji_sound", "animated_banner"],
  });
  assert.equal(limited.used, 2);
  assert.equal(limited.perks.find((perk) => perk.id === "animated_icon")?.status, "active");
  assert.equal(limited.perks.find((perk) => perk.id === "emoji_sound")?.status, "active");
  assert.equal(limited.perks.find((perk) => perk.id === "animated_banner")?.status, "suspended");

  const recovered = resolveGroupPerkStates({
    capacity: 6,
    level: 6,
    selectedIds: ["animated_icon", "emoji_sound", "animated_banner"],
  });
  assert.equal(recovered.used, 4);
  assert.equal(recovered.perks.find((perk) => perk.id === "animated_banner")?.status, "active");
});
