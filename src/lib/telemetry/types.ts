export type TelemetryPlatform = "web" | "desktop";

export type ClientErrorSource =
  | "window-error"
  | "unhandled-rejection"
  | "react-boundary";

export type ProductEventName =
  | "home_view"
  | "chat_open"
  | "message_send"
  | "voice_join"
  | "voice_reconnect"
  | "voice_reconnect_failed"
  | "screen_audio_start"
  | "screen_audio_stop"
  | "external_link_verdict"
  | "shop_view"
  | "group_boost_view"
  | "desktop_update_install";

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
