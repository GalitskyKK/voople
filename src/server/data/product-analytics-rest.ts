import { getAdminClient } from "@/lib/supabase/admin";

export async function insertProductAnalyticsEventRest(input: {
  name: string;
  actorKey: string;
  route: string;
  properties: Record<string, string | number | boolean>;
  occurredAt: string;
}) {
  const { error } = await getAdminClient().from("client_telemetry_events").insert({
    event_kind: "product",
    event_name: input.name,
    platform: "server",
    actor_key: input.actorKey,
    route: input.route,
    release: process.env.NEXT_PUBLIC_APP_RELEASE?.trim() || null,
    properties: input.properties,
    metric_value: null,
    occurred_at: input.occurredAt,
  });
  if (error) throw new Error(error.code);
}

export async function upsertProductRegistrationRest(input: {
  actorKey: string;
  registeredAt: string;
}) {
  const { error } = await getAdminClient().from("product_activation_facts").upsert({
    actor_key: input.actorKey,
    registered_at: input.registeredAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "actor_key", ignoreDuplicates: true });
  if (error) throw new Error(error.code);
}

export async function markProductActivationRest(input: {
  actorKey: string;
  reason: "reply_received" | "room_with_others";
}) {
  const now = new Date().toISOString();
  const { error } = await getAdminClient()
    .from("product_activation_facts")
    .update({ activated_at: now, activation_reason: input.reason, updated_at: now })
    .eq("actor_key", input.actorKey)
    .is("activated_at", null);
  if (error) throw new Error(error.code);
}

export async function getReplyRecipientAnalyticsRest(messageId: string) {
  const admin = getAdminClient();
  const { data: message, error: messageError } = await admin
    .from("messages")
    .select("sender_id")
    .eq("id", messageId)
    .maybeSingle();
  if (messageError) throw new Error(messageError.code);
  if (!message?.sender_id) return null;
  const { data: user, error: userError } = await admin
    .from("users")
    .select("id, created_at")
    .eq("id", message.sender_id)
    .maybeSingle();
  if (userError) throw new Error(userError.code);
  return user ? { userId: user.id as string, registeredAt: user.created_at as string } : null;
}
