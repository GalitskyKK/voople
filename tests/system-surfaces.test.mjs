import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("release history uses the shared untruncated presentation inside desktop tRPC", () => {
  const dialog = read("desktop/src/updates/DesktopReleaseNotesDialog.tsx");
  const view = read("src/components/release/ReleaseNotesView.tsx");
  const configured = read("desktop/src/DesktopConfiguredApp.tsx");
  const authenticated = read("desktop/src/DesktopAuthenticatedApp.tsx");

  assert.match(dialog, /<ReleaseNotesView/);
  assert.doesNotMatch(dialog, /function SafeReleaseNotes/);
  assert.match(dialog, /transitionResult\.failed/);
  assert.match(dialog, /new Map\(BUNDLED_RELEASES/);
  assert.doesNotMatch(view, /line-clamp|truncate/);
  assert.doesNotMatch(configured, /DesktopReleaseNotesDialog/);
  assert.match(authenticated, /<DesktopTRPCProvider[\s\S]*<DesktopReleaseNotesDialog/);
});

test("web and desktop initial states use one branded loading view", () => {
  const mainLoading = read("src/app/(main)/loading.tsx");
  const desktopConfigured = read("desktop/src/DesktopConfiguredApp.tsx");
  const consent = read("src/components/legal/LegalConsentGate.tsx");

  assert.match(mainLoading, /BrandedLoadingView/);
  assert.match(desktopConfigured, /BrandedLoadingView/);
  assert.match(consent, /status\.isPending\) return <BrandedLoadingView fullscreen/);
  assert.doesNotMatch(consent, /Проверяем сохранённое согласие/);
});

test("unknown web and desktop routes share the branded not-found view", () => {
  const rootNotFound = read("src/app/not-found.tsx");
  const profileNotFound = read("src/app/(main)/[username]/not-found.tsx");
  const postNotFound = read("src/app/(main)/post/[postId]/not-found.tsx");
  const desktopShell = read("desktop/src/shell/DesktopShell.tsx");

  for (const source of [rootNotFound, profileNotFound, postNotFound, desktopShell]) {
    assert.match(source, /NotFoundView/);
  }
  assert.doesNotMatch(desktopShell, /РАЗДЕЛ В РАЗРАБОТКЕ/);
});
