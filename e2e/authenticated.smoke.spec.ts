import { expect, test } from "@playwright/test";

const AUTHENTICATED_ROUTE_TIMEOUT = 30_000;

test.describe("authenticated critical surface", () => {
  test("authenticated messenger rail stays expanded and keeps utility actions available", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 720 });
    await page.goto("/messages", { waitUntil: "domcontentloaded" });

    const sidebar = page.locator(".voople-sidebar");
    await expect(sidebar).toHaveAttribute("data-collapsed", "false");
    await expect(sidebar).toHaveAttribute("data-sidebar-kind", "messenger");
    await expect(sidebar).toHaveCSS("width", "220px");
    await expect(page.getByRole("button", { name: /боковую панель/i })).toHaveCount(0);

    const messengerRail = page.locator(".voople-messenger-sidebar");
    await expect(messengerRail).toBeVisible();
    const searchTrigger = messengerRail.getByRole("button", { name: "Поиск", exact: true });
    await expect(searchTrigger).toBeVisible();
    await expect(searchTrigger).toHaveAttribute("aria-expanded", "false");
    await searchTrigger.click();
    await expect(searchTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("dialog", { name: "Поиск" })).toBeVisible();
    await expect(
      page.getByRole("searchbox", { name: "Поиск диалогов, групп и людей" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Поиск" })).toHaveCount(0);
    await expect(searchTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(searchTrigger).toBeFocused();

    const accountMenuTrigger = page.getByRole("button", { name: "Открыть меню аккаунта" });
    await expect(accountMenuTrigger).toBeVisible();
    await accountMenuTrigger.click();
    await expect(page.getByRole("menuitem", { name: "Помощь" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Настройки" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Выйти" })).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(page.locator(".voople-messages-layout aside")).toBeHidden();
    await expect(
      page.getByText("Выберите чат слева или начните новый", { exact: true }),
    ).toBeVisible();

    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  });

  test("messenger opens with global search and a clean wide empty state", async ({ page }) => {
    await page.goto("/messages", { waitUntil: "domcontentloaded" });

    const messengerRail = page.locator(".voople-messenger-sidebar");
    await expect(messengerRail).toBeVisible();
    const searchTrigger = messengerRail.getByRole("button", { name: "Поиск", exact: true });
    await expect(searchTrigger).toBeVisible();
    await expect(searchTrigger).toHaveAttribute("aria-expanded", "false");
    await searchTrigger.click();
    await expect(searchTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("dialog", { name: "Поиск" })).toBeVisible();
    await expect(
      page.getByRole("searchbox", { name: "Поиск диалогов, групп и людей" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Поиск" })).toHaveCount(0);
    await expect(searchTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(searchTrigger).toBeFocused();
    await expect(
      page.getByText("Выберите чат слева или начните новый", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".voople-messages-layout aside")).toBeHidden();
  });

  test("settings are separated into navigable sections", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/settings", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Настройки" })).toBeVisible({
      timeout: AUTHENTICATED_ROUTE_TIMEOUT,
    });
    const navigation = page.getByRole("navigation", { name: "Разделы настроек" });
    await expect(navigation).toBeVisible();
    await navigation.getByRole("button", { name: "Безопасность" }).click();
    await expect(page.getByRole("heading", { name: "Безопасность" })).toBeVisible();
  });

  test("privacy settings expose every product scope through the shared view", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/settings", { waitUntil: "domcontentloaded" });

    const navigation = page.getByRole("navigation", { name: "Разделы настроек" });
    await expect(navigation).toBeVisible({ timeout: AUTHENTICATED_ROUTE_TIMEOUT });
    await navigation.getByRole("button", { name: "Приватность" }).click();
    await expect(page.getByRole("heading", { name: "Приватность и активность" })).toBeVisible();
    await expect(page.locator("select")).toHaveCount(6);
    await expect(page.getByText("Показывать меня в рекомендациях", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Показывать мои интересы", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Сохранить приватность" })).toBeVisible();
  });

  test("shared sticky chrome stays opaque and Home compacts by scroll direction", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/feed", { waitUntil: "domcontentloaded" });

    const now = page.locator(".voople-home-now");
    const scrollRegion = page.locator(".voople-shell__scroll[data-voople-scroll]");
    await expect(now).toBeVisible();
    await expect(now).toHaveAttribute("data-compact", "false");
    await expect(now).toHaveCSS("position", "sticky");
    const stickyTop = await now.evaluate((element) => getComputedStyle(element).top);
    expect(stickyTop).not.toBe("auto");

    await scrollRegion.evaluate((element) => {
      const spacer = document.createElement("div");
      spacer.dataset.e2eScrollSpacer = "";
      spacer.style.height = "1600px";
      element.append(spacer);
      element.scrollTop = 160;
      element.dispatchEvent(new Event("scroll"));
    });
    await expect(now).toHaveAttribute("data-compact", "true");

    await scrollRegion.evaluate((element) => {
      element.scrollTop = 80;
      element.dispatchEvent(new Event("scroll"));
    });
    await expect(now).toHaveAttribute("data-compact", "false");

    await page.goto("/explore", { waitUntil: "domcontentloaded" });
    const searchChrome = page.locator(".voople-sticky-section-stack");
    await expect(searchChrome).toHaveCSS("position", "sticky");
    await expect(searchChrome).toHaveCSS("top", stickyTop);
  });
});
