import { expect, test } from "@playwright/test";

for (const platform of ["web", "desktop"]) for (const width of [360, 1280]) for (const theme of ["void", "light"]) {
  test(`${platform} nickname font at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    let saved = "serif"; let style = false; let failure = false; let failRead = false;
    const effective = () => style ? saved : "sans";
    const equipped = () => ({ profileEffectId: null, profileBackgroundId: null, profileFrameId: null,
      frameColor: null, cardBaseMode: "mirror", avatarRingId: null, bannerId: null, avatarDecorationId: null,
      feedCardStyleId: null, animatedAvatarId: null, appThemeId: null, savedAppThemeId: null, effectiveAppThemeId: "void",
      nicknameColor: null, nicknameGradient: false, nicknameFont: saved, savedNicknameFont: saved,
      effectiveNicknameFont: effective(), selectPremiumNicknameFont: style, nicknameEffect: "plain", themePrimary: null, themeAccent: null });
    const error = () => ({ error: { json: { message: "Access denied", code: -32600, data: { code: "BAD_REQUEST", httpStatus: 400 } } } });
    await page.addInitScript(value => localStorage.setItem("voople:app-theme", value), theme);
    await page.route("**/api/trpc/**", async route => {
      const paths = new URL(route.request().url()).pathname.split("/api/trpc/")[1].split(",");
      const values = paths.map(path => {
        let data;
        if (path === "customization.accountNicknameFont") {
          if (failRead) return error();
          data = { savedNicknameFont: saved, effectiveNicknameFont: effective(), selectPremiumNicknameFont: style };
        } else if (path === "shop.overview") data = { items: [], inventoryIds: [], equipped: equipped(), wallet: { balance: 0 } };
        else if (path === "chat.list" || path === "customization.avatarHistory") data = [];
        else if (path === "customization.update") {
          const patch = JSON.parse(route.request().postData()!)["0"].json;
          if (failure || patch.nicknameEffect || (patch.nicknameFont !== "sans" && !style)) return error();
          saved = patch.nicknameFont; data = equipped();
        } else if (path === "customization.getEquipped") data = equipped();
        else throw new Error(`Unexpected font harness query ${path}`);
        return { result: { data: { json: data } } };
      });
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(values) });
    });
    await page.goto(`/?font${platform === "desktop" ? "&desktop" : ""}`);
    await page.getByRole("button", { name: "Редактировать профиль", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Редактор профиля" });
    await dialog.getByRole("button", { name: /Стиль имени/ }).click();
    const serif = dialog.getByRole("button", { name: /^Редакционный/ });
    const mono = dialog.getByRole("button", { name: /^Моно/ });
    const preview = dialog.locator("[style*='font-family']").filter({ hasText: "Font Fixture" });
    await expect(serif).toBeDisabled(); await expect(serif).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByText(/Выбранный шрифт сохранён/)).toBeVisible();
    expect(saved).toBe("serif");
    await expect(preview).toHaveCount(0);
    const refresh = async () => page.getByRole("button", { name: "Refresh font access", exact: true }).evaluate(el => (el as HTMLButtonElement).click());
    style = true; await refresh(); await expect(serif).toBeEnabled();
    await expect(preview).toHaveCount(1); await expect(preview).toHaveCSS("font-family", /Georgia/);
    failure = true; await mono.click(); await expect(dialog.getByText("Access denied", { exact: true })).toBeVisible();
    expect(saved).toBe("serif"); await expect(preview).toHaveCSS("font-family", /Georgia/);
    failure = false; await mono.click(); await expect.poll(() => saved).toBe("mono");
    await expect(mono).toBeEnabled(); await expect(preview).toHaveCSS("font-family", /monospace/);
    await dialog.getByRole("button", { name: "Неон", exact: true }).click();
    expect(saved).toBe("mono"); // Effect remains a legacy-only trial; no font replacement.
    style = false; await refresh(); await expect(serif).toBeDisabled(); await expect(preview).toHaveCount(0); expect(saved).toBe("mono");
    style = true; await refresh(); await expect(mono).toBeEnabled(); await expect(preview).toHaveCSS("font-family", /monospace/);
    failRead = true; await refresh(); await expect(serif).toBeDisabled(); await expect(preview).toHaveCount(0); expect(saved).toBe("mono");
    failRead = false; style = false; await refresh();
    await dialog.getByRole("button", { name: "Базовый", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Базовый", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => saved).toBe("sans");
    await expect(dialog.getByRole("button", { name: "Базовый", exact: true })).toBeEnabled();
    await expect(dialog.getByRole("button", { name: "Базовый", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("nickname-font.png"), fullPage: true });
  });
}
