import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("profile editor is a shared controller-to-view boundary", () => {
  const sheet = read("src/components/profile/ProfileEditSheet.tsx");
  const controller = read("src/components/profile/editor/useProfileEditorController.ts");
  const baseline = read(".architecture-baseline.json");

  assert.match(sheet, /useProfileEditorController/);
  assert.match(sheet, /ProfileEditorPreview/);
  assert.match(sheet, /ProfileEditorTagPanel/);
  assert.doesNotMatch(sheet, /trpc\.|useMediaUpload|useState/);
  assert.match(controller, /const editorSession = useRef\(0\)/);
  assert.match(controller, /session !== editorSession\.current/);
  assert.match(controller, /cosmeticBusyRef\.current/);
  assert.doesNotMatch(baseline, /ProfileEditSheet\.tsx/);
});

test("profile cosmetics expose equip, preview and acquisition as distinct actions", () => {
  const catalog = read("src/components/profile/editor/ProfileEditorAssetGrid.tsx");
  const namePanel = read("src/components/profile/editor/ProfileEditorNamePanel.tsx");

  assert.match(catalog, /Используется сейчас/);
  assert.match(catalog, /Примерить/);
  assert.match(catalog, /Получить/);
  assert.match(catalog, /item\.owned/);
  assert.match(namePanel, /onChange=.*previewPatch/);
  assert.match(namePanel, /onBlur=.*commitPatch/);
});

test("profile tag selection uses memberships and the server-owned mutation", () => {
  const controller = read("src/components/profile/editor/useProfileEditorController.ts");
  const panel = read("src/components/profile/editor/ProfileEditorTagPanel.tsx");

  assert.match(controller, /trpc\.chat\.list\.useQuery/);
  assert.match(controller, /trpc\.chat\.setGroupProfileTag\.useMutation/);
  assert.match(controller, /chat\.type === "group" && !chat\.parentChatId/);
  assert.match(panel, /Тег рядом с вашим именем/);
  assert.match(panel, /Не показывать тег/);
  assert.match(panel, /ProfileGroupTagVisual/);
});

test("closing the profile editor protects unsaved identity fields", () => {
  const sheet = read("src/components/profile/ProfileEditSheet.tsx");
  const controller = read("src/components/profile/editor/useProfileEditorController.ts");

  assert.match(controller, /if \(!force && dirty\)/);
  assert.match(controller, /setDiscardOpen\(true\)/);
  assert.match(sheet, /Закрыть без сохранения\?/);
  assert.match(sheet, /Оформление и тег уже сохранены отдельно/);
});
