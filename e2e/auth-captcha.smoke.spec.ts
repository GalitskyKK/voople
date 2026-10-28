import { expect, test } from "@playwright/test";

test.describe("CAPTCHA login", () => {
  test.skip(!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY, "Build with a Turnstile test site key to exercise CAPTCHA");

  for (const width of [360, 1280]) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`password, code and resend use fresh tokens at ${width}px in ${colorScheme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme });
        await page.route("https://challenges.cloudflare.com/turnstile/v0/api.js*", (route) => route.fulfill({
          contentType: "application/javascript",
          body: `(() => {
            let options, element, counter = 0;
            const issue = () => setTimeout(() => {
              const token = 'captcha-' + ++counter;
              options.callback(token);
              element.dataset.testToken = token;
            }, 0);
            window.turnstile = {
              render(container, next) { element = container; options = next; issue(); return 'test-widget'; },
              reset() { issue(); }, remove() {}
            };
          })();`,
        }));
        const tokens: string[] = [];
        await page.route("**/api/auth/password-login", async (route) => {
          tokens.push(route.request().postDataJSON().captchaToken);
          await route.fulfill({ status: 202, json: { verificationRequired: true } });
        });
        await page.route("**/auth/v1/otp*", async (route) => {
          tokens.push(route.request().postDataJSON().gotrue_meta_security.captcha_token);
          await route.fulfill({ json: {} });
        });
        await page.goto("/login");
        await expect(page.locator("#voople-turnstile")).toBeAttached();
        const challenge = page.locator('[aria-label="Антибот-проверка"]');
        await expect(challenge).toHaveAttribute("data-test-token", /^captcha-\d+$/);
        await page.getByRole("textbox", { name: "Email" }).fill("login-test@example.com");
        await page.getByLabel("Пароль", { exact: true }).fill("test-password");
        await page.getByRole("button", { name: "Войти", exact: true }).click();
        await expect(page.getByRole("button", { name: "Отправить код", exact: true })).toBeVisible();
        await expect(challenge).not.toHaveAttribute("data-test-token", tokens[0]);
        await page.getByRole("button", { name: "Отправить код", exact: true }).click();
        const resend = page.getByRole("button", { name: "Отправить код ещё раз", exact: true });
        await expect(resend).toBeVisible();
        await expect(challenge).not.toHaveAttribute("data-test-token", tokens[1]);
        await resend.click();
        await expect.poll(() => tokens.length).toBe(3);
        expect(tokens.every((token) => /^captcha-\d+$/.test(token))).toBe(true);
        expect(new Set(tokens).size).toBe(3);
        await expect(page.getByText("Пройдите антибот-проверку", { exact: true })).toHaveCount(0);
        const geometry = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
      });
    }
  }
});
