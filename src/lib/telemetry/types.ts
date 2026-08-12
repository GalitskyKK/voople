export type TelemetryPlatform = "web" | "desktop";

export type ClientErrorSource =
  | "window-error"
  | "unhandled-rejection"
  | "react-boundary";

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
    };
