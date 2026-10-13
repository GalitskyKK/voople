import { expect, test } from "@playwright/test";

for (const platform of ["web", "desktop"]) for (const width of [360, 1280]) for (const theme of ["void", "light"]) for (const surface of ["profile", "store"]) {
  test(`${platform} ${surface} profile card at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    let style = false, failure = false;
    const saved = { profileFrameId: "frame-custom" as string | null, frameColor: "#123456" as string | null,
      cardBaseMode: "theme", themePrimary: "#123456" as string | null, themeAccent: "#abcdef" as string | null };
    const capabilities = () => ({ selectPremiumProfileFramePreset: style, selectCustomFrameColor: style,
      selectPremiumCardBaseMode: style, selectProfilePalette: style });
    const equipped = () => ({ ...saved, ...capabilities(), savedProfileFrameId: saved.profileFrameId, savedFrameColor: saved.frameColor,
      savedCardBaseMode: saved.cardBaseMode, savedThemePrimary: saved.themePrimary, savedThemeAccent: saved.themeAccent,
      effectiveProfileFrameId: style || saved.profileFrameId === "frame-slate" ? saved.profileFrameId : null,
      effectiveFrameColor: style ? saved.frameColor : null, effectiveCardBaseMode: style ? saved.cardBaseMode : "mirror",
      effectiveThemePrimary: style ? saved.themePrimary : "#0A0A0F", effectiveThemeAccent: style ? saved.themeAccent : "#7B3AED",
      profileEffectId: null, profileBackgroundId: null, avatarRingId: null, bannerId: null, avatarDecorationId: null,
      feedCardStyleId: null, animatedAvatarId: null, appThemeId: null, savedAppThemeId: null, effectiveAppThemeId: "void",
      nicknameColor: null, savedNicknameColor: null, effectiveNicknameColor: null, selectCustomNicknameColor: style,
      nicknameGradient: false, nicknameFont: "sans", savedNicknameFont: "sans", effectiveNicknameFont: "sans", selectPremiumNicknameFont: style,
      nicknameEffect: "plain", savedNicknameEffect: "plain", savedNicknameGradient: false, effectiveNicknameEffect: "plain", effectiveNicknameGradient: false, selectPremiumNicknameEffect: style });
    const error = () => ({ error: { json: { message: "Access denied", code: -32600, data: { code: "BAD_REQUEST", httpStatus: 400 } } } });
    await page.addInitScript(value => localStorage.setItem("voople:app-theme", value), theme);
    await page.route("**/api/trpc/**", async route => {
      const paths = new URL(route.request().url()).pathname.split("/api/trpc/")[1].split(",");
      const values = paths.map(path => {
        let data;
        if (path === "customization.accountNicknameFont") data = { ...capabilities(), selectCustomNicknameColor: style, selectPremiumNicknameFont: style, selectPremiumNicknameEffect: style };
        else if (path === "shop.overview") data = { items: [], inventoryIds: [], equipped: equipped(), wallet: { balance: 0 } };
        else if (path === "chat.list" || path === "customization.avatarHistory") data = [];
        else if (path === "customization.update") {
          const patch = JSON.parse(route.request().postData()!)["0"].json;
          if (failure) return error(); Object.assign(saved, patch); data = equipped();
        } else if (path === "customization.getEquipped") data = equipped();
        else throw new Error(`Unexpected card query ${path}`);
        return { result: { data: { json: data } } };
      });
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(values) });
    });
    await page.goto(`/?${surface === "profile" ? "font" : "card-store"}${platform === "desktop" ? "&desktop" : ""}`);
    const refresh = async () => page.getByRole("button", { name: surface === "profile" ? "Refresh font access" : "Refresh card access", exact: true }).evaluate(el => (el as HTMLButtonElement).click());
    if (surface === "profile") {
      await page.getByRole("button", { name: "Редактировать профиль", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Редактор профиля" });
      await dialog.getByRole("button", { name: /Рамка карточки/ }).click();
      const custom = dialog.getByRole("button", { name: /Свой цвет/ });
      await expect(custom).toBeDisabled(); await expect(custom).toHaveAttribute("aria-pressed", "true");
      await expect(dialog.getByText(/Рамка сохранена/)).toBeVisible();
      await expect(dialog.getByRole("button", { name: /Slate/ })).toBeEnabled();
      await expect(dialog.locator(".profile-card--framed-solid")).toHaveCount(0);
      style = true; await refresh(); await expect(custom).toBeEnabled(); await expect(dialog.locator(".profile-card--framed-solid")).toHaveCount(1);
      await dialog.getByRole("button", { name: /Баннер и фон/ }).click();
      const plain = dialog.getByRole("button", { name: /Спокойный фон/ });
      await expect(plain).toBeEnabled(); await expect(dialog.getByRole("button", { name: /Загрузить/ })).toBeDisabled();
      failure = true; await plain.click(); await expect(dialog.getByText("Access denied", { exact: true })).toBeVisible(); expect(saved.cardBaseMode).toBe("theme");
      failure = false; await plain.click(); await expect.poll(() => saved.cardBaseMode).toBe("plain");
      style = false; await refresh(); await expect(plain).toBeDisabled(); await expect(dialog.getByText(/Основа сохранена/)).toBeVisible();
      await expect(dialog.getByRole("button", { name: /Продолжение баннера/ })).toBeEnabled();
      await dialog.getByRole("button", { name: /Продолжение баннера/ }).click(); await expect.poll(() => saved.cardBaseMode).toBe("mirror");
      await dialog.getByRole("button", { name: /Рамка карточки/ }).click();
      await dialog.getByRole("button", { name: /Slate/ }).click(); await expect.poll(() => saved.profileFrameId).toBe("frame-slate");
    } else {
      const custom = page.getByRole("button", { name: /Свой цвет/ });
      const color = page.getByLabel("Цвет рамки", { exact: true });
      const primary = page.getByLabel("Основной", { exact: true });
      await expect(custom).toBeDisabled(); await expect(color).toBeDisabled(); await expect(primary).toBeDisabled();
      await expect(page.getByText(/Цвета сохранены/)).toBeVisible(); await expect(page.locator(".profile-card--framed-solid")).toHaveCount(0);
      style = true; await refresh(); await expect(custom).toBeEnabled(); await expect(color).toBeEnabled(); await expect(primary).toBeEnabled();
      await expect(page.locator(".profile-card--framed-solid")).toHaveCount(1);
      failure = true; await color.fill("#abcdef"); await expect(page.getByRole("alert")).toHaveText("Access denied"); expect(saved.frameColor).toBe("#123456");
      failure = false; await color.fill("#fedcba"); await expect.poll(() => saved.frameColor).toBe("#fedcba");
      await primary.fill("#abcdef"); failure = true; await page.getByRole("button", { name: "Обновить", exact: true }).click();
      await expect(primary).toHaveValue("#123456"); expect(saved.themePrimary).toBe("#123456");
      failure = false; await primary.fill("#abcdef"); await page.getByRole("button", { name: "Обновить", exact: true }).click(); await expect.poll(() => saved.themePrimary).toBe("#abcdef");
      style = false; await refresh(); await expect(color).toBeDisabled(); await expect(primary).toBeDisabled(); expect(saved.frameColor).toBe("#fedcba"); expect(saved.themePrimary).toBe("#abcdef");
      await expect(page.locator(".profile-card--framed-solid")).toHaveCount(0);
      style = true; await refresh(); await expect(primary).toHaveValue("#abcdef"); await expect(page.locator(".profile-card--framed-solid")).toHaveCount(1);
      await page.getByRole("button", { name: "Зеркало баннера", exact: true }).click(); await expect.poll(() => saved.cardBaseMode).toBe("mirror");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("profile-card.png"), fullPage: true });
  });
}
