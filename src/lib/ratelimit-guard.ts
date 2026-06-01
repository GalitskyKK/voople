import { TRPCError } from "@trpc/server";
import type { Ratelimit } from "@upstash/ratelimit";

export async function assertRateLimit(
  limiter: () => Ratelimit,
  userId: string,
): Promise<void> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return;
  }
  try {
    const { success } = await limiter().limit(userId);
    if (!success) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Слишком много запросов" });
    }
  } catch (e) {
    if (e instanceof TRPCError) throw e;
    // Redis недоступен — не блокируем пользователя
  }
}
