import type { ClientTelemetryEvent } from "@/lib/telemetry/types";

export function recordClientTelemetry(event: ClientTelemetryEvent) {
  const record = JSON.stringify({
    event: event.kind === "error" ? "client_error" : "client_metric",
    ...event,
  });
  if (event.kind === "error") {
    console.error(record);
  } else {
    console.info(record);
  }
}
