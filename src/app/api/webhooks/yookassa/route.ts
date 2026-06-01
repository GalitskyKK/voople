import { NextResponse } from "next/server";

import { updatePaymentIntentStatusRest } from "@/server/data/shop-rest";

type YooKassaWebhookPayload = {
  type?: string;
  event?: string;
  object?: {
    id?: string;
    status?: string;
    metadata?: Record<string, string>;
  };
};

/**
 * YooKassa webhook entrypoint.
 * Fulfillment (inventory / wallet / donation) will be wired when checkout is enabled.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.YOOKASSA_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "YooKassa webhook is not configured" }, { status: 503 });
  }

  const signature = request.headers.get("x-yookassa-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  let payload: YooKassaWebhookPayload;
  try {
    payload = (await request.json()) as YooKassaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const paymentId = payload.object?.id;
  const status = payload.object?.status;
  const intentId = payload.object?.metadata?.paymentIntentId;

  if (intentId && paymentId && status) {
    const mappedStatus =
      status === "succeeded"
        ? "succeeded"
        : status === "canceled"
          ? "canceled"
          : status === "waiting_for_capture" || status === "pending"
            ? "pending"
            : "failed";

    await updatePaymentIntentStatusRest(intentId, mappedStatus, paymentId);
  }

  return NextResponse.json({ ok: true });
}
