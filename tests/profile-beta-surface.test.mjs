import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("beta profile does not request or mount deferred social feed", () => {
  const switchSource = read("src/lib/product/profile-beta-surface.ts");
  const page = read("src/components/profile/ProfilePageView.tsx");
  const web = read("src/components/profile/ProfilePage.tsx");
  const desktop = read("desktop/src/profile/useDesktopProfile.ts");

  assert.match(switchSource, /PROFILE_POSTS_VISIBLE = false/);
  assert.match(switchSource, /PROFILE_STATUS_VISIBLE = false/);
  assert.match(switchSource, /PROFILE_QUESTIONS_VISIBLE = false/);
  assert.match(page, /context\?: ReactNode/);
  assert.doesNotMatch(page, /ProfileFeedTabs|renderComposer|renderPost/);
  assert.doesNotMatch(web, /getPostsByUsername|profile\.view|profile_views|postgres_changes/);
  assert.doesNotMatch(desktop, /getPostsByUsername|getPinnedPostByUsername/);
  const data = read("src/server/data/profile-rest.ts");
  assert.doesNotMatch(data.slice(data.indexOf("export async function getProfilePageDataRest"), data.indexOf("export async function getPostsByUsernameRest")), /fetchPostsByAuthorId|profile_views|follows/);
  assert.match(data, /export async function getPostsByUsernameRest/);
});

test("profile card, mini profile, share image and editor agree on beta visibility", () => {
  for (const path of [
    "src/components/profile/ProfileCard.tsx",
    "desktop/src/adapters/DesktopProfileAdapter.tsx",
    "src/components/profile/MiniProfileCardView.tsx",
    "src/components/profile/ProfileAppearanceCardVisual.tsx",
  ]) {
    assert.match(read(path), /PROFILE_STATUS_VISIBLE/, path);
  }
  assert.doesNotMatch(read("src/components/profile/ProfileCardBodyVisual.tsx"), /ProfileStats/);
  assert.doesNotMatch(read("src/components/profile/ProfileAppearanceCardVisual.tsx"), /stats\.(posts|followers|views)/);
  assert.match(read("src/components/profile/ProfileEditSheet.tsx"), /PROFILE_POSTS_VISIBLE/);
  assert.match(read("src/components/profile/ProfileShareView.tsx"), /PROFILE_POSTS_VISIBLE/);
  assert.match(read("src/components/profile/ProfileQuestions.tsx"), /PROFILE_POSTS_VISIBLE && isOwner/);
});
