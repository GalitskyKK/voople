import { expect, test } from "@playwright/test";

const AUTHENTICATED_ROUTE_TIMEOUT = 30_000;

test.describe("authenticated critical surface", () => {
  test("global rail defaults compact and pins expansion without hiding utility actions", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 720 });
    await page.goto("/messages", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      window.localStorage.removeItem("voople:sidebar-collapsed:v1");
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    const sidebar = page.locator(".voople-sidebar");
    const collapseControl = page.getByRole("button", {
      name: "Развернуть боковую панель",
    });
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");
    await expect(sidebar).toHaveCSS("width", "72px");
    await expect(collapseControl).toHaveCSS("opacity", "0");
    await expect(page.getByRole("link", { name: "Помощь" })).toHaveCount(0);
    const accountMenuTrigger = page.getByRole("button", { name: "Открыть меню аккаунта" });
    await expect(accountMenuTrigger).toBeVisible();
    await accountMenuTrigger.click();
    await expect(page.getByRole("menuitem", { name: "Помощь" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Настройки" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Выйти" })).toBeVisible();
    await page.keyboard.press("Escape");

    const chatList = page.locator(".voople-messages-layout aside");
    const conversation = page.locator(".voople-messages-layout section");
    const compactGeometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    const chatListWidth = (await chatList.boundingBox())?.width ?? 0;
    expect(chatListWidth).toBeGreaterThanOrEqual(280);
    expect(chatListWidth).toBeLessThanOrEqual(320);
    expect((await conversation.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(620);
    expect(compactGeometry.scrollWidth).toBeLessThanOrEqual(compactGeometry.clientWidth);

    await sidebar.hover();
    await expect(collapseControl).toHaveCSS("opacity", "1");
    await page.getByRole("link", { name: "Чаты" }).hover();
    await expect(page.getByRole("tooltip")).toHaveText("Чаты");

    await collapseControl.click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "false");
    await expect(sidebar).toHaveCSS("width", "216px");
    await page.locator(".voople-shell__main").hover();
    await expect(page.getByRole("button", { name: "Свернуть боковую панель" })).toHaveCSS(
      "opacity",
      "0",
    );
    await expect.poll(() => page.evaluate(() => (
      window.localStorage.getItem("voople:sidebar-collapsed:v1")
    ))).toBe("false");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".voople-sidebar")).toHaveAttribute("data-collapsed", "false");
  });

  test("messenger opens and exposes search without mutating production data", async ({ page }) => {
    await page.goto("/messages", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Чаты" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: /Найти чат, группу или контакт/i })).toBeVisible();
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
    await navigation.getByRole("button", { name: "Приватность и активность" }).click();
    await expect(page.getByRole("heading", { name: "Приватность и активность" })).toBeVisible();
    await expect(page.locator("select")).toHaveCount(6);
    await expect(page.getByText("Показывать меня в рекомендациях", { exact: true })).toBeVisible();
    await expect(page.getByText("Показывать мои интересы", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Сохранить приватность" })).toBeVisible();
  });

  test("shared sticky chrome stays opaque and Home compacts by scroll direction", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/feed", { waitUntil: "domcontentloaded" });

    const now = page.locator(".voople-home-now");
    const scrollRegion = page.locator("[data-voople-scroll]").first();
    await expect(now).toBeVisible();
    await expect(now).toHaveAttribute("data-compact", "false");
    await expect(now).toHaveCSS("position", "sticky");
    await expect(now).toHaveCSS("top", "0px");

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
    await expect(searchChrome).toHaveCSS("top", "0px");
    await expect(searchChrome).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  });
});
