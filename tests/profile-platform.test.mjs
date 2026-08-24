import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("web and desktop compose the canonical profile card view", () => {
  assert.match(read("src/components/profile/ProfileCard.tsx"), /ProfileCardView/);
  assert.match(read("desktop/src/profile/DesktopProfile.tsx"), /ProfileCardView/);
  assert.equal(existsSync("desktop/src/profile/DesktopProfileCard.tsx"), false);
  assert.equal(existsSync("desktop/src/profile/DesktopProfileAvatar.tsx"), false);
  assert.equal(existsSync("desktop/src/profile/DesktopProfileActions.tsx"), false);
});

test("profile sharing uses one controller on web and desktop", () => {
  assert.match(read("src/components/profile/ProfileShareCardButton.tsx"), /ProfileShareController/);
  assert.match(read("desktop/src/adapters/DesktopProfileShareAdapter.tsx"), /ProfileShareController/);
  assert.equal(existsSync("desktop/src/profile/DesktopProfileShareButton.tsx"), false);
});

test("desktop profile loads and renders profile pins", () => {
  assert.match(read("desktop/src/profile/useDesktopProfile.ts"), /engagement\.badges/);
  assert.match(read("desktop/src/profile/DesktopProfile.tsx"), /ProfileBadgesView/);
});

test("desktop entry imports only the client-safe object storage module", () => {
  const source = read("desktop/src/main.tsx");
  assert.match(source, /@\/lib\/object-storage\/urls/);
  assert.doesNotMatch(source, /from ["']@\/lib\/object-storage["']/);
});

test("mini profile shares the canonical customization layers on web and desktop", () => {
  const popover = read("src/components/feed/MiniProfilePopover.tsx");
  const authorVisual = read("src/components/feed/PostAuthorVisual.tsx");
  const desktopAuthor = read("desktop/src/adapters/DesktopPostAuthorAdapter.tsx");
  const miniCard = read("src/components/profile/MiniProfileCardView.tsx");
  const profileVisual = read("src/components/profile/ProfileCardVisual.tsx");

  assert.match(popover, /MiniProfileCardView/);
  assert.match(authorVisual, /MiniProfilePopover/);
  assert.match(desktopAuthor, /PostAuthorVisual/);
  assert.match(miniCard, /ProfileCardVisual/);
  assert.match(miniCard, /ProfileAvatar/);
  assert.match(miniCard, /ProfileStats/);
  assert.equal(profileVisual.match(/ProfileCardEffectLayer/g)?.length, 3);
});
