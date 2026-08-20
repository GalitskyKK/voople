import { expect, test } from "@playwright/test";

test.describe("authenticated critical surface", () => {
  test("messenger opens and exposes search without mutating production data", async ({ page }) => {
    await page.goto("/messages", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Чаты" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: /Найти чат, группу или контакт/i })).toBeVisible();
  });

  test("settings are separated into navigable sections", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Настройки" })).toBeVisible();
    const navigation = page.getByRole("navigation", { name: "Разделы настроек" });
    await expect(navigation).toBeVisible();
    await navigation.getByRole("button", { name: "Безопасность" }).click();
    await expect(page.getByRole("heading", { name: "Безопасность" })).toBeVisible();
  });
});
