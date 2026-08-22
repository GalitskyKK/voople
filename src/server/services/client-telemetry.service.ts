import { createHmac } from "node:crypto";

import type { ClientTelemetryEvent } from "@/lib/telemetry/types";
import type { ProductEventName } from "@/lib/telemetry/types";
import { telemetryRouteTemplate } from "@/lib/telemetry/privacy";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  getReplyRecipientAnalyticsRest,
  insertProductAnalyticsEventRest,
  markProductActivationRest,
  upsertProductRegistrationRest,
} from "@/server/data/product-analytics-rest";

function actorKey(userId: string) {
  const secret = process.env.ANALYTICS_ACTOR_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new Error("Analytics actor secret is not configured");
  return createHmac("sha256", secret).update(userId).digest("hex");
}

export async function recordServerProductEvent(input: {
  name: ProductEventName;
  actorId: string;
  route: string;
  properties?: Record<string, string | number | boolean>;
}) {
  try {
    await insertProductAnalyticsEventRest({
      name: input.name,
      actorKey: actorKey(input.actorId),
      route: telemetryRouteTemplate(input.route),
      properties: input.properties ?? {},
      occurredAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error(JSON.stringify({
      event: "server_product_telemetry_failed",
      eventName: input.name,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return false;
  }
}

export async function registerAnalyticsActor(userId: string, registeredAt: Date) {
  try {
    await upsertProductRegistrationRest({
      actorKey: actorKey(userId),
      registeredAt: registeredAt.toISOString(),
    });
  } catch {
    return false;
  }
  return true;
}

export async function markRoomActivation(userId: string) {
  try {
    await markProductActivationRest({ actorKey: actorKey(userId), reason: "room_with_others" });
  } catch {
    return false;
  }
  return true;
}

export async function markReplyRecipientActivation(replyToMessageId: string) {
  try {
    const recipient = await getReplyRecipientAnalyticsRest(replyToMessageId);
    if (!recipient) return false;
    await registerAnalyticsActor(recipient.userId, new Date(recipient.registeredAt));
    await markProductActivationRest({
      actorKey: actorKey(recipient.userId),
      reason: "reply_received",
    });
  } catch {
    return false;
  }
  return true;
}

export async function recordClientTelemetry(event: ClientTelemetryEvent) {
  const record = JSON.stringify({
    event: event.kind === "error"
      ? "client_error"
      : event.kind === "metric"
        ? "client_metric"
        : "product_event",
    eventName: event.name,
    platform: event.platform,
    route: telemetryRouteTemplate(event.route),
    release: event.release,
  });
  if (event.kind === "error") {
    console.error(record);
  } else {
    console.info(record);
  }

  const properties = event.kind === "product"
    ? event.properties ?? {}
    : event.kind === "metric"
      ? {
          rating: event.rating ?? null,
          navigationType: event.navigationType ?? null,
        }
      : {
          source: event.source,
          errorName: event.name,
        };
  const { error } = await getAdminClient().from("client_telemetry_events").insert({
    event_kind: event.kind,
    event_name: event.name,
    platform: event.platform,
    route: telemetryRouteTemplate(event.route),
    release: event.release ?? null,
    properties,
    metric_value: event.kind === "metric" ? event.value : null,
    occurred_at: event.occurredAt,
  });
  if (error) {
    console.error(JSON.stringify({
      event: "client_telemetry_persist_failed",
      code: error.code,
    }));
    return false;
  }
  return true;
}
