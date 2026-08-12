import "server-only";

const DEFAULT_API_URL =
  "https://goapi.unisender.ru/ru/transactional/api/v1/email/send.json";

type SendTransactionalEmailInput = {
  to: string;
  subject: string;
  html: string;
  plaintext: string;
  idempotenceKey: string;
};

type UnisenderError = {
  status?: unknown;
  code?: unknown;
  message?: unknown;
};

function getConfig() {
  const apiKey = process.env.UNISENDER_GO_API_KEY?.trim();
  const fromEmail = process.env.UNISENDER_GO_FROM_EMAIL?.trim();
  const fromName = process.env.UNISENDER_GO_FROM_NAME?.trim() || "Voople";
  const apiUrl = process.env.UNISENDER_GO_API_URL?.trim() || DEFAULT_API_URL;

  if (!apiKey || !fromEmail) {
    throw new Error("Transactional email is not configured");
  }
  return { apiKey, fromEmail, fromName, apiUrl };
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
) {
  const config = getConfig();
  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-API-KEY": config.apiKey,
    },
    body: JSON.stringify({
      message: {
        recipients: [{ email: input.to }],
        body: { html: input.html, plaintext: input.plaintext },
        subject: input.subject,
        from_email: config.fromEmail,
        from_name: config.fromName,
        track_links: 0,
        track_read: 0,
        idempotence_key: input.idempotenceKey.slice(0, 64),
      },
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as UnisenderError | null;
  const duplicateAcceptedRequest = Number(payload?.code) === 1573;
  if (!response.ok && !duplicateAcceptedRequest) {
    throw new Error(`Transactional email provider rejected the request (${response.status})`);
  }
}
