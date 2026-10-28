import assert from "node:assert/strict";
import test from "node:test";

import { getPasswordLoginFailure } from "../src/lib/auth/login-error.ts";
import { getEmailDeliveryErrorMessage } from "../src/lib/auth/email-delivery-error.ts";

test("CAPTCHA rejection is actionable for password and OTP login without exposing provider details", () => {
  for (const error of [
    { code: "captcha_failed", status: 400 },
    { message: "captcha protection: request disallowed (no captcha_token found)", status: 400 },
    { message: "CAPTCHA verification failed", status: 500 },
  ]) {
    const failure = getPasswordLoginFailure(error);
    assert.equal(failure.status, 400);
    assert.match(failure.error, /антибот-проверку/);
    assert.equal(getEmailDeliveryErrorMessage(error), failure.error);
    assert.doesNotMatch(failure.error, /captcha_token|Неверный email/);
  }
});

test("password login preserves invalid credentials, rate limits and temporary outages as distinct failures", () => {
  assert.equal(getPasswordLoginFailure({ code: "invalid_credentials", status: 400 }).status, 401);
  assert.equal(getPasswordLoginFailure({ code: "over_request_rate_limit", status: 400 }).status, 429);
  assert.equal(getPasswordLoginFailure({ status: 429 }).status, 429);
  for (const error of [{ status: 503 }, { status: 0 }, { message: "fetch failed" }]) {
    assert.equal(getPasswordLoginFailure(error).status, 503);
  }
  assert.match(getEmailDeliveryErrorMessage({ message: "SMTP unavailable", status: 500 }), /отправить письмо/);
  assert.match(getEmailDeliveryErrorMessage({ code: "over_email_send_rate_limit" }), /Подождите минуту/);
});
