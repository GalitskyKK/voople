export type TelemetryPlatform = "web" | "desktop";

export type ClientErrorSource =
  | "window-error"
  | "unhandled-rejection"
  | "react-boundary";

export const PRODUCT_EVENT_NAMES = [
  "signup_started",
  "signup_completed",
  "invite_opened",
  "invite_joined",
  "friend_invited",
  "home_opened",
  "presence_seen",
  "presence_clicked",
  "presence_message_started",
  "presence_room_joined",
  "chat_opened",
  "message_sent",
  "message_replied",
  "attachment_sent",
  "reaction_used",
  "room_created",
  "room_opened",
  "room_joined",
  "room_left",
  "room_minimized",
  "room_compacted",
  "room_expanded",
  "room_invite_sent",
  "camera_started",
  "screen_share_started",
  "group_created",
  "group_joined",
  "group_topics_updated",
  "section_created",
  "role_created",
  "appearance_changed",
  "custom_emoji_added",
  "custom_sound_added",
  "profile_opened",
  "interest_added",
  "interest_removed",
  "privacy_updated",
  "mini_profile_opened",
  "cosmetic_previewed",
  "cosmetic_equipped",
  "store_opened",
  "item_viewed",
  "checkout_started",
  "purchase_completed",
  "gift_started",
  "gift_sent",
  "plus_viewed",
  "plus_started",
  "boost_assigned",
  "boost_purchased",
  "perk_enabled",
  "perk_disabled",
  "events_opened",
  "voice_reconnect",
  "voice_reconnect_failed",
  "screen_audio_start",
  "screen_audio_stop",
  "external_link_verdict",
  "group_boost_view",
  "desktop_update_install",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export const PRODUCT_EVENT_PROPERTY_KEYS = [
  "action",
  "attempts",
  "category",
  "count",
  "durationSeconds",
  "hasAttachment",
  "hasAudio",
  "hasReply",
  "insecureHttp",
  "itemKind",
  "kind",
  "nowItems",
  "continueItems",
  "providerAvailable",
  "reason",
  "result",
  "source",
  "state",
  "surface",
  "verdict",
  "version",
] as const;

export type ProductEventPropertyKey = (typeof PRODUCT_EVENT_PROPERTY_KEYS)[number];

export type ClientTelemetryEvent =
  | {
      version: 1;
      kind: "error";
      platform: TelemetryPlatform;
      route: string;
      occurredAt: string;
      release?: string;
      source: ClientErrorSource;
      name: string;
      message: string;
      stack?: string;
    }
  | {
      version: 1;
      kind: "metric";
      platform: TelemetryPlatform;
      route: string;
      occurredAt: string;
      release?: string;
      name: string;
      value: number;
      rating?: "good" | "needs-improvement" | "poor";
      navigationType?: string;
    }
  | {
      version: 1;
      kind: "product";
      platform: TelemetryPlatform;
      route: string;
      occurredAt: string;
      release?: string;
      name: ProductEventName;
      properties?: Record<string, string | number | boolean>;
    };
