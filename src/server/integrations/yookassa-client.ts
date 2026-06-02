import { getAppOrigin } from "@/lib/payments/app-url";
import { getYooKassaCredentials, type YooKassaCredentials } from "@/lib/payments/yookassa-config";

const YOOKASSA_API = "https://api.yookassa.ru/v3";

type YooKassaAmount = {
  value: string;
  currency: "RUB";
};

export type YooKassaPayment = {
  id: string;
  status: string;
  paid: boolean;
  amount: YooKassaAmount;
  confirmation?: {
    type: string;
    confirmation_url?: string;
  };
  metadata?: Record<string, string>;
};

type CreatePaymentInput = {
  amountRub: number;
  description: string;
  metadata: Record<string, string>;
  returnPath?: string;
};

function authHeader(credentials: YooKassaCredentials): string {
  const token = Buffer.from(`${credentials.shopId}:${credentials.secretKey}`).toString("base64");
  return `Basic ${token}`;
}

function formatAmountRub(amountRub: number): string {
  return `${amountRub}.00`;
}

function idempotenceKey(): string {
  return crypto.randomUUID();
}

async function yookassaFetch<T>(
  credentials: YooKassaCredentials,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${YOOKASSA_API}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(credentials),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "description" in body
        ? String((body as { description: unknown }).description)
        : response.statusText;
    throw new Error(`ЮKassa: ${detail || "ошибка запроса"}`);
  }

  return body as T;
}

export async function createYooKassaPayment(input: CreatePaymentInput): Promise<YooKassaPayment> {
  const credentials = getYooKassaCredentials();
  if (!credentials) {
    throw new Error("ЮKassa не настроена: добавьте YOO_KASSA_SHOP_ID и YOO_KASSA_SECRET_KEY");
  }

  const returnUrl = `${getAppOrigin()}${input.returnPath ?? "/shop/payment/return"}`;

  return yookassaFetch<YooKassaPayment>(credentials, "/payments", {
    method: "POST",
    headers: { "Idempotence-Key": idempotenceKey() },
    body: JSON.stringify({
      amount: {
        value: formatAmountRub(input.amountRub),
        currency: "RUB",
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: returnUrl,
      },
      description: input.description.slice(0, 128),
      metadata: input.metadata,
    }),
  });
}

export async function getYooKassaPayment(paymentId: string): Promise<YooKassaPayment> {
  const credentials = getYooKassaCredentials();
  if (!credentials) {
    throw new Error("ЮKassa не настроена");
  }
  return yookassaFetch<YooKassaPayment>(credentials, `/payments/${paymentId}`);
}
