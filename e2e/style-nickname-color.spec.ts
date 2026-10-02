import { expect, test } from "@playwright/test";

for (const platform of ["web", "desktop"]) for (const width of [360, 1280]) for (const theme of ["void", "light"]) {
  test(`${platform} nickname color at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    let saved: string | null = "#123456"; let style = false; let failure = false; let failRead = false;
    const effective = () => saved === "#ef4444" || style ? saved : null;
    const equipped = () => ({ profileEffectId: null, profileBackgroundId: null, profileFrameId: null,
      frameColor: null, cardBaseMode: "mirror", avatarRingId: null, bannerId: null, avatarDecorationId: null,
      feedCardStyleId: null, animatedAvatarId: null, appThemeId: null, savedAppThemeId: null, effectiveAppThemeId: "void",
      nicknameColor: saved, savedNicknameColor: saved, effectiveNicknameColor: effective(), selectCustomNicknameColor: style,
      nicknameGradient: false, nicknameFont: "sans", savedNicknameFont: "sans", effectiveNicknameFont: "sans",
      selectPremiumNicknameFont: style, nicknameEffect: "plain", savedNicknameEffect: "plain", savedNicknameGradient: false,
      effectiveNicknameEffect: "plain", effectiveNicknameGradient: false, selectPremiumNicknameEffect: style, themePrimary: null, themeAccent: null });
    const error = () => ({ error: { json: { message: "Access denied", code: -32600, data: { code: "BAD_REQUEST", httpStatus: 400 } } } });
    await page.addInitScript(value => localStorage.setItem("voople:app-theme", value), theme);
    await page.route("**/api/trpc/**", async route => {
      const paths = new URL(route.request().url()).pathname.split("/api/trpc/")[1].split(",");
      const values = paths.map(path => {
        let data;
        if (path === "customization.accountNicknameFont") {
          if (failRead) return error();
          data = { selectCustomNicknameColor: style, selectPremiumNicknameFont: style, selectPremiumNicknameEffect: style };
        } else if (path === "shop.overview") data = { items: [], inventoryIds: [], equipped: equipped(), wallet: { balance: 0 } };
        else if (path === "chat.list" || path === "customization.avatarHistory") data = [];
        else if (path === "customization.update") {
          const patch = JSON.parse(route.request().postData()!)["0"].json;
          if (failure || (patch.nicknameColor && patch.nicknameColor !== "#ef4444" && !style)) return error();
          saved = patch.nicknameColor; data = equipped();
        } else if (path === "customization.getEquipped") data = equipped();
        else throw new Error(`Unexpected color harness query ${path}`);
        return { result: { data: { json: data } } };
      });
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(values) });
    });
    await page.goto(`/?font${platform === "desktop" ? "&desktop" : ""}`);
    await page.getByRole("button", { name: "Редактировать профиль", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Редактор профиля" });
    await dialog.getByRole("button", { name: /Стиль имени/ }).click();
    const picker = dialog.getByLabel("Свой цвет имени", { exact: true });
    const preview = dialog.getByText("Font Fixture", { exact: true });
    const refresh = async () => page.getByRole("button", { name: "Refresh font access", exact: true }).evaluate(el => (el as HTMLButtonElement).click());
    await expect(picker).toBeDisabled();
    await expect(dialog.getByText(/Выбранный цвет сохранён/)).toBeVisible();
    await expect(preview).not.toHaveCSS("color", "rgb(18, 52, 86)"); expect(saved).toBe("#123456");
    for (const color of ["#ef4444", "#f59e0b", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"]) {
      await expect(dialog.getByRole("button", { name: `Цвет имени ${color}`, exact: true })).toBeEnabled();
    }
    style = true; await refresh(); await expect(picker).toBeEnabled(); await expect(preview).toHaveCSS("color", "rgb(18, 52, 86)");
    await picker.focus(); await picker.blur(); expect(saved).toBe("#123456");
    failure = true;
    await picker.evaluate(el => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, "#abcdef"); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); });
    await expect(dialog.getByText("Access denied", { exact: true })).toBeVisible();
    expect(saved).toBe("#123456"); await expect(preview).toHaveCSS("color", "rgb(18, 52, 86)");
    failure = false;
    await picker.evaluate(el => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, "#abcdef"); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); });
    await expect.poll(() => saved).toBe("#abcdef"); await expect(preview).toHaveCSS("color", "rgb(171, 205, 239)");
    style = false; await refresh(); await expect(picker).toBeDisabled(); await expect(preview).not.toHaveCSS("color", "rgb(171, 205, 239)");
    expect(saved).toBe("#abcdef"); style = true; await refresh(); await expect(preview).toHaveCSS("color", "rgb(171, 205, 239)");
    failRead = true; await refresh(); await expect(picker).toBeDisabled(); await expect(preview).not.toHaveCSS("color", "rgb(171, 205, 239)");
    failRead = false; style = false; await refresh();
    await dialog.getByRole("button", { name: "Цвет имени #ef4444", exact: true }).click();
    await expect.poll(() => saved).toBe("#ef4444"); await expect(preview).toHaveCSS("color", "rgb(239, 68, 68)");
    await dialog.getByRole("button", { name: "Цвет темы", exact: true }).click(); await expect.poll(() => saved).toBe(null);
    style = true; await refresh(); await expect(preview).not.toHaveCSS("color", "rgb(171, 205, 239)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("nickname-color.png"), fullPage: true });
  });
}
