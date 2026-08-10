import { expect, test } from "@playwright/test";

test.describe("public release surface", () => {
  test("landing exposes the primary value and conversion actions", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Созвонились на пять минут/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Забрать свой @username/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Скачать для Windows/i })).toBeVisible();
  });

  test("authentication entry points remain available", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Войти" })).toBeVisible();

    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Регистрация" })).toBeVisible();
  });

  test("protected messenger redirects an anonymous visitor to login", async ({ page }) => {
    await page.goto("/messages");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fmessages$/);
  });

  test("desktop download route returns an explicit release response", async ({ request }) => {
    const response = await request.get("/download/desktop", { maxRedirects: 0 });
    expect([307, 503]).toContain(response.status());
    if (response.status() === 307) {
      expect(response.headers().location).toMatch(/^https:\/\//);
    }
  });
});
