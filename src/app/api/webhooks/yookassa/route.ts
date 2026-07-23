import { NextResponse } from "next/server";

import { rateLimits } from "@/lib/ratelimit";
import { checkRateLimit } from "@/lib/ratelimit-guard";
import { isYooKassaConfigured } from "@/lib/payments/yookassa-config";
import { getPaymentIntentRest, updatePaymentIntentStatusRest } from "@/server/data/shop-rest";
import { getYooKassaPayment } from "@/server/integrations/yookassa-client";
import { fulfillSucceededPaymentIntent } from "@/server/services/shop.service";

type YooKassaWebhookPayload = {
  type?: string;
  event?: string;
  object?: {
    id?: string;
    status?: string;
    paid?: boolean;
    metadata?: Record<string, string>;
  };
};

function mapPaymentStatus(status: string | undefined): "pending" | "succeeded" | "canceled" | "failed" {
  if (status === "succeeded") return "succeeded";
  if (status === "canceled") return "canceled";
  if (status === "waiting_for_capture" || status === "pending") return "pending";
  return "failed";
}

/**
 * Входящие уведомления ЮKassa.
 * @see https://yookassa.ru/developers/using-api/webhooks
 */
export async function POST(request: Request) {
  if (!isYooKassaConfigured()) {
    return NextResponse.json({ error: "YooKassa is not configured" }, { status: 503 });
  }

  // Эндпоинт неаутентифицирован (YooKassa не подписывает вебхуки), поэтому
  // троттлим по IP до обращения к внешнему API. Платёж всё равно повторно
  // верифицируется ниже через getYooKassaPayment.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  if (!(await checkRateLimit(rateLimits.webhook, `yookassa:${ip}`))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let payload: YooKassaWebhookPayload;
  try {
    payload = (await request.json()) as YooKassaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const paymentId = payload.object?.id;
  const intentId = payload.object?.metadata?.paymentIntentId;

  if (!paymentId || !intentId) {
    return NextResponse.json({ ok: true });
  }

  let verifiedStatus = payload.object?.status;
  let verifiedPaid = payload.object?.paid === true;
  let verifiedAmount: string | null = null;
  let verifiedCurrency: string | null = null;
  let verifiedMetadata: Record<string, string> | undefined;

  try {
    const payment = await getYooKassaPayment(paymentId);
    if (payment.metadata?.paymentIntentId !== intentId) {
      return NextResponse.json({ error: "Intent mismatch" }, { status: 400 });
    }
    verifiedStatus = payment.status;
    verifiedPaid = payment.paid;
    verifiedAmount = payment.amount.value;
    verifiedCurrency = payment.amount.currency;
    verifiedMetadata = payment.metadata;
  } catch {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 502 });
  }

  const mappedStatus = mapPaymentStatus(verifiedStatus);

  const intent = await getPaymentIntentRest(intentId);
  if (!intent) {
    return NextResponse.json({ error: "Payment intent not found" }, { status: 404 });
  }
  if (intent.external_id && intent.external_id !== paymentId) {
    return NextResponse.json({ error: "Payment ID mismatch" }, { status: 400 });
  }
  if (verifiedCurrency !== "RUB" || Number(verifiedAmount) !== intent.amount_rub) {
    return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
  }
  if (
    (verifiedMetadata?.userId && verifiedMetadata.userId !== intent.user_id) ||
    (verifiedMetadata?.kind && verifiedMetadata.kind !== intent.kind)
  ) {
    return NextResponse.json({ error: "Payment metadata mismatch" }, { status: 400 });
  }

  if (mappedStatus === "succeeded" && verifiedPaid) {
    try {
      await fulfillSucceededPaymentIntent(intentId, paymentId);
    } catch {
      await updatePaymentIntentStatusRest(intentId, "failed", paymentId);
      return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
    }
  } else if (mappedStatus !== "pending") {
    await updatePaymentIntentStatusRest(intentId, mappedStatus, paymentId);
  }

  return NextResponse.json({ ok: true });
}
