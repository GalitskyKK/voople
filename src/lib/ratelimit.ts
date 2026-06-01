import { Ratelimit } from "@upstash/ratelimit";

import { getRedis } from "./redis";

function createLimit(requests: number, window: `${number} s` | `${number} m` | `${number} h` | `${number} d`) {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(requests, window),
  });
}

export const rateLimits = {
  createPost: () => createLimit(30, "1 h"),
  like: () => createLimit(100, "10 m"),
  updateStatus: () => createLimit(20, "1 h"),
  uploadTrack: () => createLimit(10, "24 h"),
};
