import { NextResponse } from "next/server";
import { z } from "zod";

import { desktopCorsPreflight, withDesktopCors } from "@/lib/http/desktop-cors";
import { rateLimits } from "@/lib/ratelimit";
import { checkRateLimit } from "@/lib/ratelimit-guard";
import { recordClientTelemetry } from "@/server/services/client-telemetry.service";
import {
  PRODUCT_EVENT_NAMES,
  PRODUCT_EVENT_PROPERTY_KEYS,
} from "@/lib/telemetry/types";

const baseSchema = z.object({
  version: z.literal(1),
  platform: z.enum(["web", "desktop"]),
  route: z.string().min(1).max(160).regex(/^\/[a-zA-Z0-9_\-/]*$/),
  occurredAt: z.string().datetime(),
  release: z.string().min(1).max(40).optional(),
});

const bodySchema = z.discriminatedUnion("kind", [
  baseSchema.extend({
    kind: z.literal("error"),
    source: z.enum(["window-error", "unhandled-rejection", "react-boundary"]),
    name: z.string().min(1).max(80),
    message: z.string().min(1).max(500),
    stack: z.string().max(1_800).optional(),
  }),
  baseSchema.extend({
    kind: z.literal("metric"),
    name: z.string().min(1).max(80),
    value: z.number().finite().nonnegative().max(3_600_000),
    rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
    navigationType: z.string().min(1).max(40).optional(),
  }),
  baseSchema.extend({
    kind: z.literal("product"),
    name: z.enum(PRODUCT_EVENT_NAMES),
    properties: z.record(
      z.string().min(1).max(40),
      z.union([z.string().max(80), z.number().finite(), z.boolean()]),
    ).optional().refine(
      (properties) => !properties || Object.keys(properties).every(
        (key) => (PRODUCT_EVENT_PROPERTY_KEYS as readonly string[]).includes(key),
      ),
      "Unsupported telemetry property",
    ),
  }),
]);

export async function POST(request: Request) {
  const respond = (response: Response) => withDesktopCors(request, response);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8_192) {
    return respond(NextResponse.json({ error: "Payload too large" }, { status: 413 }));
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  if (!(await checkRateLimit(rateLimits.telemetry, `telemetry:${ip}`))) {
    return respond(NextResponse.json({ error: "Too many requests" }, { status: 429 }));
  }

  const rawBody = await request.text().catch(() => "");
  if (rawBody.length > 8_192) {
    return respond(NextResponse.json({ error: "Payload too large" }, { status: 413 }));
  }
  const parsed = bodySchema.safeParse(
    (() => {
      try {
        return JSON.parse(rawBody) as unknown;
      } catch {
        return null;
      }
    })(),
  );
  if (!parsed.success) {
    return respond(NextResponse.json({ error: "Invalid telemetry event" }, { status: 400 }));
  }

  const persisted = await recordClientTelemetry(parsed.data);
  return respond(NextResponse.json({ accepted: true, persisted }, { status: 202 }));
}

export function OPTIONS(request: Request) {
  return desktopCorsPreflight(request);
}
