import { expect, test } from "@playwright/test";

for (const platform of ["web", "desktop"]) for (const width of [360, 1280]) for (const theme of ["void", "light"]) {
  test(`${platform} nickname effect at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    let saved = "neon"; let style = false; let failure = false; let failRead = false;
    const effective = () => style ? saved : "plain";
    const equipped = () => ({ profileEffectId: null, profileBackgroundId: null, profileFrameId: null,
      frameColor: null, cardBaseMode: "mirror", avatarRingId: null, bannerId: null, avatarDecorationId: null,
      feedCardStyleId: null, animatedAvatarId: null, appThemeId: null, savedAppThemeId: null, effectiveAppThemeId: "void",
      nicknameColor: null, nicknameGradient: saved === "gradient", nicknameFont: "sans", savedNicknameFont: "sans",
      effectiveNicknameFont: "sans", selectPremiumNicknameFont: style, nicknameEffect: saved, savedNicknameEffect: saved,
      savedNicknameGradient: saved === "gradient", effectiveNicknameEffect: effective(), effectiveNicknameGradient: style && saved === "gradient", selectPremiumNicknameEffect: style, themePrimary: null, themeAccent: null });
    const error = () => ({ error: { json: { message: "Access denied", code: -32600, data: { code: "BAD_REQUEST", httpStatus: 400 } } } });
    await page.addInitScript(value => localStorage.setItem("voople:app-theme", value), theme);
    await page.route("**/api/trpc/**", async route => {
      const paths = new URL(route.request().url()).pathname.split("/api/trpc/")[1].split(",");
      const values = paths.map(path => {
        let data;
        if (path === "customization.accountNicknameFont") {
          if (failRead) return error();
          data = { savedNicknameFont: "sans", effectiveNicknameFont: "sans", selectPremiumNicknameFont: style, selectPremiumNicknameEffect: style };
        } else if (path === "shop.overview") data = { items: [], inventoryIds: [], equipped: equipped(), wallet: { balance: 0 } };
        else if (path === "chat.list" || path === "customization.avatarHistory") data = [];
        else if (path === "customization.update") {
          const patch = JSON.parse(route.request().postData()!)["0"].json;
          if (failure || (patch.nicknameEffect !== "plain" && !style)) return error();
          saved = patch.nicknameEffect; data = equipped();
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
    const neon = dialog.getByRole("button", { name: /^Неон/ });
    const gradient = dialog.getByRole("button", { name: /^Градиент/ });
    const preview = dialog.getByText("Font Fixture", { exact: true });
    const refresh = async () => page.getByRole("button", { name: "Refresh font access", exact: true }).evaluate(el => (el as HTMLButtonElement).click());
    await expect(neon).toBeDisabled(); await expect(neon).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByText(/Выбранный эффект сохранён/)).toBeVisible();
    await expect(preview).toHaveCSS("text-shadow", "none"); expect(saved).toBe("neon");
    style = true; await refresh(); await expect(neon).toBeEnabled();
    await expect(preview).not.toHaveCSS("text-shadow", "none");
    failure = true; await gradient.click(); await expect(dialog.getByText("Access denied", { exact: true })).toBeVisible();
    expect(saved).toBe("neon"); await expect(preview).not.toHaveCSS("text-shadow", "none");
    failure = false; await gradient.click(); await expect.poll(() => saved).toBe("gradient");
    await expect(preview).toHaveCSS("background-image", /linear-gradient/);
    style = false; await refresh(); await expect(neon).toBeDisabled(); await expect(preview).toHaveCSS("background-image", "none");
    expect(saved).toBe("gradient");
    style = true; await refresh(); await expect(gradient).toBeEnabled(); await expect(preview).toHaveCSS("background-image", /linear-gradient/);
    failRead = true; await refresh(); await expect(neon).toBeDisabled(); await expect(preview).toHaveCSS("background-image", "none");
    expect(saved).toBe("gradient");
    failRead = false; style = false; await refresh();
    const plain = dialog.getByRole("button", { name: "Минимализм", exact: true });
    await plain.click(); await expect.poll(() => saved).toBe("plain"); await expect(plain).toHaveAttribute("aria-pressed", "true");
    style = true; await refresh(); await expect(preview).toHaveCSS("background-image", "none"); await expect(preview).toHaveCSS("text-shadow", "none");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("nickname-effect.png"), fullPage: true });
  });
}
