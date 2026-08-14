import { expect, test } from "@playwright/test";

test.describe("public release surface", () => {
  test("landing exposes the primary value and conversion actions", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Позвал своих/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Открыть в браузере/i }).first()).toHaveAttribute(
      "href",
      "/feed",
    );
    await expect(page.getByRole("link", { name: /Скачать для Windows/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Сначала посмотреть/i })).toHaveCount(0);
  });

  test("landing remains readable without horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Позвал своих/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Открыть в браузере/i }).first()).toBeVisible();

    const viewport = await page.evaluate(() => {
      const clientWidth = document.documentElement.clientWidth;
      const overflowSources = [...document.querySelectorAll<HTMLElement>("body *")]
        .map((element) => ({
          selector: element.className || element.tagName.toLowerCase(),
          right: Math.round(element.getBoundingClientRect().right),
        }))
        .filter(({ right }) => right > clientWidth + 1)
        .slice(0, 8);
      return {
        clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflowSources,
      };
    });
    expect(viewport.scrollWidth, JSON.stringify(viewport.overflowSources)).toBeLessThanOrEqual(
      viewport.clientWidth,
    );
  });

  test("authentication entry points remain available", async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Войти" })).toBeVisible();

    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Регистрация" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Я принимаю/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "политику конфиденциальности" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
  });

  test("privacy policy is public and identifies the operator", async ({ page }) => {
    await page.goto("/legal/privacy");
    await expect(page.getByRole("heading", { name: "Политика конфиденциальности" })).toBeVisible();
    await expect(page.getByText("662510924150")).toBeVisible();
  });

  test("product story keeps the demo visible while scenes change", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const frame = page.locator(".landing-product-frame");

    await page.locator('[data-story-id="messages"]').scrollIntoViewIfNeeded();
    await expect(frame).toHaveAttribute("data-scene", "messages");
    await expect(frame).toBeInViewport({ ratio: 0.85 });

    await page.locator('[data-story-id="rooms"]').scrollIntoViewIfNeeded();
    await expect(frame).toHaveAttribute("data-scene", "rooms");
    await expect(frame).toBeInViewport({ ratio: 0.85 });
  });

  test("protected messenger redirects an anonymous visitor to login", async ({ page }) => {
    await page.goto("/messages");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fmessages$/);
  });

  test("help stays available while onboarding remains protected", async ({ page }) => {
    await page.goto("/help");
    await expect(
      page.getByRole("heading", { name: "Справочный центр" }),
    ).toBeVisible();
    await expect(
      page.getByRole("searchbox", { name: "Поиск по справке" }),
    ).toBeVisible();

    await page.setViewportSize({ width: 360, height: 800 });
    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);

    await page.goto("/onboarding?username=test_user");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("desktop download route returns an explicit release response", async ({ request }) => {
    const response = await request.get("/download/desktop", { maxRedirects: 0 });
    expect([307, 503]).toContain(response.status());
    if (response.status() === 307) {
      expect(response.headers().location).toMatch(/^https:\/\//);
    }
  });

  test("telemetry endpoint validates privacy-safe client events", async ({ request }) => {
    const accepted = await request.post("/api/telemetry", {
      data: {
        version: 1,
        kind: "metric",
        platform: "web",
        route: "/help",
        occurredAt: new Date().toISOString(),
        name: "e2e-contract",
        value: 1,
        rating: "good",
      },
    });
    expect(accepted.status()).toBe(202);

    const rejected = await request.post("/api/telemetry", {
      data: { kind: "error", message: "missing required privacy contract" },
    });
    expect(rejected.status()).toBe(400);
  });

  test("account export never exposes data without authentication", async ({ request }) => {
    const response = await request.get("/api/account/export");
    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Не авторизован" });
    expect(response.headers()["cache-control"]).not.toContain("public");
  });
});
