import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("web and desktop share settings presentation and device-only reset scope", () => {
  const shared = read("src/components/settings/AppSettingsView.tsx");
  const web = read("src/components/settings/AppSettingsPage.tsx");
  const desktop = read("desktop/src/settings/DesktopSettings.tsx");

  assert.match(web, /<AppSettingsView/);
  assert.match(desktop, /<AppSettingsView/);
  assert.match(shared, /\["appearance", "advanced"\]\.includes\(activeSection\)/);
  assert.match(shared, /action=\{\s*showsDevicePreferences \?/);
  assert.match(shared, /aria-label="Сбросить настройки этого устройства"/);
  assert.match(shared, /variant="plain"/);
});

test("settings surfaces use existing theme tokens and visible keyboard focus", () => {
  const css = read("src/app/globals.css");

  assert.match(css, /\.settings-section \{[^}]*var\(--material-panel-fill\)/);
  assert.match(css, /\.settings-nav button:focus-visible \{[\s\S]*?var\(--theme-accent\)/);
});

test("beta settings keep account and device sections while deferring old social controls", () => {
  const nav = read("src/components/settings/SettingsNavigation.tsx");
  const privacy = read("src/components/social/UserPrivacySettingsPanel.tsx");
  const web = read("src/components/settings/WebPrivacySettings.tsx");
  for (const label of ["Аккаунт", "Профиль", "Приватность", "Уведомления", "Голос и видео", "Внешний вид", "Безопасность", "Дополнительно"]) {
    assert.ok(nav.includes(label));
  }
  assert.doesNotMatch(nav, /"Чаты"|"Документы"|"Горячие клавиши"/);
  assert.match(web, /betaOnly/);
  assert.match(privacy, /Только друзья/);
  assert.match(privacy, /!betaOnly \?/);
});
