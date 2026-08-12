import { initializeClientTelemetry } from "@/lib/telemetry/client";

initializeClientTelemetry({
  enabled: process.env.NODE_ENV === "production",
  endpoint: "/api/telemetry",
  platform: "web",
  release: process.env.NEXT_PUBLIC_APP_RELEASE,
});
