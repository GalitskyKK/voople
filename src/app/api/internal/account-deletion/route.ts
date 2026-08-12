import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { runAccountDeletionWorker } from "@/server/services/account-deletion-worker.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const inputSchema = z.object({
  limit: z.number().int().min(1).max(10).default(5),
});

function authorized(request: Request, secret: string) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";
  const expected = Buffer.from(secret);
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const secret = process.env.ACCOUNT_DELETION_WORKER_SECRET?.trim();
  if (!secret || secret.length < 32) {
    return noStoreJson({ error: "Worker unavailable" }, 503);
  }
  if (!authorized(request, secret)) {
    return noStoreJson({ error: "Unauthorized" }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1_024) {
    return noStoreJson({ error: "Invalid request" }, 400);
  }
  const raw = await request.text().catch(() => "");
  const parsed = inputSchema.safeParse(raw ? (() => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  })() : {});
  if (!parsed.success) {
    return noStoreJson({ error: "Invalid request" }, 400);
  }

  try {
    return noStoreJson(await runAccountDeletionWorker(parsed.data.limit));
  } catch {
    return noStoreJson({ error: "Worker failed" }, 500);
  }
}
