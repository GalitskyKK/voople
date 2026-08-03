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
  updatePost: () => createLimit(30, "10 m"),
  deletePost: () => createLimit(30, "10 m"),
  reportPost: () => createLimit(10, "1 h"),
  recordView: () => createLimit(300, "10 m"),
  like: () => createLimit(100, "10 m"),
  updateStatus: () => createLimit(20, "1 h"),
  uploadTrack: () => createLimit(10, "24 h"),
  uploadChat: () => createLimit(30, "1 h"),
  // Жёсткий лимит против перебора промокодов.
  applyPromo: () => createLimit(10, "1 h"),
  createPayment: () => createLimit(10, "10 m"),
  // Анти-спам для записи-тяжёлых мутаций (сообщения, комментарии, репосты, подписки, штрихи холста).
  sendMessage: () => createLimit(60, "1 m"),
  createGroupChat: () => createLimit(8, "1 h"),
  openDirectChat: () => createLimit(60, "10 m"),
  manageGroupChat: () => createLimit(30, "1 h"),
  createChatInvite: () => createLimit(20, "1 h"),
  acceptChatInvite: () => createLimit(20, "10 m"),
  enterChatRoom: () => createLimit(30, "10 m"),
  comment: () => createLimit(40, "10 m"),
  repost: () => createLimit(40, "10 m"),
  follow: () => createLimit(60, "10 m"),
  canvasStroke: () => createLimit(120, "1 m"),
  // Анонимные вопросы — низкий лимит против спама в инбоксе.
  askQuestion: () => createLimit(15, "1 h"),
  // Входящие вебхуки (ключ — IP источника): троттлинг до обращения к внешнему API.
  webhook: () => createLimit(120, "1 m"),
  adminUpload: () => createLimit(30, "1 h"),
};
