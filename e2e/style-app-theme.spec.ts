import { expect, test } from "@playwright/test";

for (const platform of ["web", "desktop"]) for (const width of [360, 1280]) test(`${platform} account theme flow at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  let saved = "violet"; let style = false; let legacy = false; let denyMutation = false;
  let failRead = false;
  const effective = () => saved === "void" || saved === "light" || style || legacy ? saved : "void";
  await page.addInitScript(() => localStorage.setItem("voople:app-theme", "gold"));
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    const paths = url.pathname.split("/api/trpc/")[1].split(",");
    const values = paths.map(path => {
      if (path === "customization.accountTheme") {
        if (failRead) return { error: { json: { message: "Temporary outage", code: -32603, data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 } } } };
        return { result: { data: { json: { savedAppThemeId: saved, effectiveAppThemeId: effective(), access: {
          evaluatedAt: new Date().toISOString(), policyVersion: "app-theme-legacy-or-style-v1",
          sources: { activeLegacySubscription: legacy, activeStyleCoverage: style }, capabilities: { selectPaidAppTheme: style || legacy },
        } } } } };
      }
      if (path === "shop.subscriptionStatus") return { result: { data: { json: { active: legacy } } } };
      if (path === "customization.update") {
        if (denyMutation) return { error: { json: { message: "Access denied", code: -32600, data: { code: "BAD_REQUEST", httpStatus: 400 } } } };
        const body = JSON.parse(route.request().postData()!);
        saved = body["0"].json.appThemeId;
        return { result: { data: { json: { savedAppThemeId: saved, effectiveAppThemeId: effective() } } } };
      }
      throw new Error(`Unexpected harness request: ${path}`);
    });
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(values) });
  });
  await page.goto(platform === "desktop" ? "/?desktop" : "/");
  await page.getByRole("button", { name: "Внешний вид", exact: true }).click();
  const root = page.locator("html");
  const violet = page.getByRole("button", { name: /^Violet Pulse\./ });
  const aurora = page.getByRole("button", { name: /^Аврора/ });
  await expect(root).toHaveAttribute("data-app-theme", "void");
  await expect(violet).toBeDisabled(); await expect(aurora).toBeDisabled();
  expect(saved).toBe("violet");
  await page.reload(); await page.getByRole("button", { name: "Внешний вид", exact: true }).click();
  await expect(root).toHaveAttribute("data-app-theme", "void"); expect(saved).toBe("violet");
  style = true; await page.getByRole("button", { name: "Refresh account" }).click();
  await expect(root).toHaveAttribute("data-app-theme", "violet"); await expect(violet).toBeEnabled();
  await expect(aurora).toBeDisabled();
  denyMutation = true;
  await page.getByRole("button", { name: /^Neon Rose\./ }).click();
  await expect(page.getByText("Access denied", { exact: true })).toBeVisible();
  await expect(root).toHaveAttribute("data-app-theme", "violet"); expect(saved).toBe("violet");
  expect(await page.evaluate(() => localStorage.getItem("voople:app-theme"))).toBe("gold");
  denyMutation = false;
  style = false; await page.getByRole("button", { name: "Refresh account" }).click();
  await expect(root).toHaveAttribute("data-app-theme", "void"); expect(saved).toBe("violet");
  await page.getByRole("button", { name: /^Light\./ }).click();
  await expect(root).toHaveAttribute("data-app-theme", "light"); expect(saved).toBe("light");
  style = true; await page.getByRole("button", { name: "Refresh account" }).click();
  await expect(violet).toBeEnabled(); await violet.click();
  await expect(root).toHaveAttribute("data-app-theme", "violet"); expect(saved).toBe("violet");
  failRead = true; await page.getByRole("button", { name: "Refresh account" }).click();
  await expect(root).toHaveAttribute("data-app-theme", "void"); expect(saved).toBe("violet");
  failRead = false; legacy = true; style = false; await page.getByRole("button", { name: "Refresh account" }).click();
  await expect(root).toHaveAttribute("data-app-theme", "violet"); await expect(aurora).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
